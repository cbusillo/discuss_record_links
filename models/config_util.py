from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Tuple

import json
from odoo.tools.safe_eval import safe_eval


@dataclass
class ModelCfg:
    key: str
    model: str
    label: str
    search: List[str]
    display_template: str
    image_field: str | None
    limit: int
    enabled: bool = True


CFG_PARAM = "discuss_record_links.models"


def default_config() -> Dict[str, ModelCfg]:
    return {}


def load_config(env) -> Dict[str, ModelCfg]:
    ICP = env["ir.config_parameter"].sudo()
    raw = ICP.get_param(CFG_PARAM) or ""
    cfg: Dict[str, ModelCfg] = default_config()
    if raw:
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                out: Dict[str, ModelCfg] = {}
                for key, val in data.items():
                    if not isinstance(val, dict):
                        continue
                    base = cfg.get(key, ModelCfg(key, "", key, [], "{{ display_name }}", None, 8))
                    out[key] = ModelCfg(
                        key=key,
                        model=val.get("model") or base.model,
                        label=val.get("label") or base.label,
                        search=list(val.get("search") or base.search),
                        display_template=val.get("display_template") or base.display_template,
                        image_field=val.get("image_field", base.image_field),
                        limit=int(val.get("limit") or base.limit),
                        enabled=bool(val.get("enabled", base.enabled)),
                    )
                cfg.update(out)
        except Exception:
            # Fallback for legacy python-literal configs
            try:
                data = safe_eval(raw, {})
                if isinstance(data, dict):
                    out: Dict[str, ModelCfg] = {}
                    for key, val in data.items():
                        if not isinstance(val, dict):
                            continue
                        base = cfg.get(key, ModelCfg(key, "", key, [], "{{ display_name }}", None, 8))
                        out[key] = ModelCfg(
                            key=key,
                            model=val.get("model") or base.model,
                            label=val.get("label") or base.label,
                            search=list(val.get("search") or base.search),
                            display_template=val.get("display_template") or base.display_template,
                            image_field=val.get("image_field", base.image_field),
                            limit=int(val.get("limit") or base.limit),
                            enabled=bool(val.get("enabled", base.enabled)),
                        )
                    cfg.update(out)
            except Exception:
                # keep defaults on malformed input
                pass
    return {k: v for k, v in cfg.items() if v.enabled}


VAR_RE = re.compile(r"{{\s*(\w+)\s*}}")


def extract_template_fields(template: str) -> List[str]:
    return [m.group(1) for m in VAR_RE.finditer(template or "")]


def render_template(template: str, values: dict) -> str:
    def repl(m: re.Match[str]) -> str:
        k = m.group(1)
        v = values.get(k)
        return str(v or "")

    return VAR_RE.sub(repl, template)


def parse_prefix(term: str, config: Dict[str, ModelCfg]) -> Tuple[str | None, str]:
    t = (term or "").lstrip()
    if ":" in t:
        # short form: p: query, m: query, etc.
        pfx, rest = t.split(":", 1)
        key = pfx.lower().strip()
        if key in config:
            return config[key].model, rest.strip()
    parts = t.split(" ", 1)
    if len(parts) >= 2:
        key = parts[0].lower()
        if key in config:
            return config[key].model, parts[1]
        for k, c in config.items():
            if key in (k, c.label.lower()):
                return c.model, parts[1]
    return None, t
