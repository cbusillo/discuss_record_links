from __future__ import annotations

from typing import List

from odoo import http
from odoo.http import request

from ..models.config_util import load_config, extract_template_fields, render_template, parse_prefix, ModelCfg


class DiscussRecordLinks(http.Controller):
    @http.route("/discuss_record_links/search", type="json", auth="user", methods=["POST"])
    def search(self, term: str = ""):
        env = request.env
        cfg = load_config(env)

        model_filter, query = parse_prefix(term or "", cfg)
        tokens = [t for t in (query or "").strip().split() if t]

        def build_domain(c: ModelCfg):
            if not tokens:
                return []
            domain = []
            for t in tokens:
                if not c.search:
                    sub = ["name", "ilike", t]
                else:
                    # OR across fields for a single token
                    sub: List = []
                    for i, f in enumerate(c.search):
                        if i:
                            sub.insert(0, "|")
                        sub += [[f, "ilike", t]]
                domain = ["&", domain, sub] if domain else sub
            return domain

        suggestions = []
        for key, c in cfg.items():
            if model_filter and c.model != model_filter:
                continue
            domain = build_domain(c)
            # fields needed for display template + display_name fallback
            fields = {"display_name"}
            fields.update(extract_template_fields(c.display_template))
            rows = env[c.model].sudo().search_read(domain, list(fields), limit=c.limit)
            for r in rows:
                # render label per model config
                label = render_template(c.display_template or "{{ display_name }}", r) or r.get("display_name")
                suggestions.append(
                    {
                        "group": c.label,
                        "model": c.model,
                        "id": r["id"],
                        "label": label,
                    }
                )

        # Return a single flat list; client groups by .group
        return {"suggestions": suggestions}
