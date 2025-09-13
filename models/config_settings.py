from __future__ import annotations

import json

from odoo import api, fields, models

from .config_util import CFG_PARAM, default_config


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    discuss_record_links_models = fields.Char(
        string="Record Link Models (JSON)",
        help=(
            "JSON mapping of prefixes to model configs. Example:\n"
            '{\n  "pro": {"model": "product.product", "label": "Products", "search": ["default_code", "name"], "display_template": "[{{ default_code }}] {{ name }}", "limit": 8 }\n}'
        ),
        config_parameter=CFG_PARAM,
    )

    @api.model
    def get_values(self):
        res = super().get_values()
        icp = self.env["ir.config_parameter"].sudo()
        raw = icp.get_param(CFG_PARAM)
        if not raw:
            # pretty default for first-time UX
            pretty = json.dumps({k: v.__dict__ for k, v in default_config().items()}, indent=2)
            res["discuss_record_links_models"] = pretty
        return res
