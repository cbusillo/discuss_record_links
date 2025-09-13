{
    "name": "Discuss: Smart Record Links",
    "version": "18.0.1.0",
    "category": "Productivity/Discuss",
    "summary": "Type [ to search and insert links to products, motors, and more in Discuss/Chatter",
    "depends": ["mail", "product", "web", "web_editor"],
    "data": [],
    "assets": {
        # Editor (email templates, notes)
        "web_editor.assets_wysiwyg": [
            # inline provider only; no powerbox command
        ],
        # Backend (Discuss/Chatter lives here in 18)
        "web.assets_backend": [
            "discuss_record_links/static/src/js/mail_suggestion_patch.js",
            "discuss_record_links/static/src/js/suggestion_service_patch.js",
            "discuss_record_links/static/src/js/composer_patch.js",
            "discuss_record_links/static/src/js/message_link_label_patch.js",
        ],
    },
    "license": "LGPL-3",
    "installable": True,
}
