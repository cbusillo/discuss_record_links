import { patch } from "@web/core/utils/patch"
import { Message } from "@mail/core/common/message"

function parseInternalUrl(href) {
    try {
        const url = new URL(href, window.location.origin)
        // Case 1: hash params (/web#id=..&model=..)
        if (url.hash?.startsWith('#')) {
            const params = new URLSearchParams(url.hash.slice(1))
            const id = params.get('id')
            const model = params.get('model')
            if (id && model) return { id: Number(id), model }
        }
        // Case 2: pretty internal path (/odoo/<model>/<id>)
        const parts = url.pathname.split('/').filter(Boolean)
        const odooIdx = parts.indexOf('odoo')
        if (odooIdx >= 0 && parts.length >= odooIdx + 3) {
            const model = decodeURIComponent(parts[odooIdx + 1])
            const idStr = parts[odooIdx + 2]
            const id = Number(idStr)
            if (model && id) return { id, model }
        }
        return {}
    } catch {
        return {}
    }
}

patch(Message.prototype, {
    prepareMessageBody(bodyEl) {
        if (super.prepareMessageBody) {
            super.prepareMessageBody(...arguments)
        }
        // 1) Convert plain internal URLs to anchors (covers localhost where core linkify won't)
        convertInternalTextToAnchors(bodyEl)

        // 2) Enhance internal record links: replace URL text with record name
        const anchors = bodyEl.querySelectorAll('a[href*="/web#"], a[href*="/odoo#"], a[href*="/odoo/"]')
        if (!anchors?.length) return
        const orm = this.env.services.orm
        for (const a of anchors) {
            if (a.dataset.oeModel && a.dataset.oeId) {
                continue // already processed (mentions etc.)
            }
            const { id, model } = parseInternalUrl(a.getAttribute('href') || '')
            if (!id || !model) continue
            // Replace label unconditionally with display name once parsed
            ;(async () => {
                try {
                    const res = await orm.call(model, 'read', [[id], ['display_name']], {})
                    const name = Array.isArray(res) && res[0] ? res[0].display_name : null
                    if (name) {
                        a.textContent = name
                        a.setAttribute('data-oe-id', String(id))
                        a.setAttribute('data-oe-model', model)
                    }
                } catch {
                    // ignore
                }
            })()
        }
    },
})

function convertInternalTextToAnchors(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const internals = []
    const reAbs = /(https?:\/\/[^\s]+(?:\/web#[^\s]*|\/odoo\/[\w.]+\/[0-9]+))/g
    const reWebHash = /(\/web#[^\s]+)/g
    const rePretty = /(\/odoo\/[\w.]+\/[0-9]+)/g
    let node
    while ((node = walker.nextNode())) {
        const text = node.textContent || ''
        if (!reAbs.test(text) && !reWebHash.test(text) && !rePretty.test(text)) continue
        const frag = document.createDocumentFragment()
        let idx = 0
        for (const match of text.matchAll(new RegExp(`${reAbs.source}|${reWebHash.source}|${rePretty.source}`, 'g'))) {
            const m = match[0]
            const start = match.index || 0
            if (start > idx) frag.append(document.createTextNode(text.slice(idx, start)))
            const a = document.createElement('a')
            a.href = m
            a.textContent = m
            frag.append(a)
            internals.push(a)
            idx = start + m.length
        }
        if (idx < text.length) frag.append(document.createTextNode(text.slice(idx)))
        node.parentNode.replaceChild(frag, node)
    }
    return internals
}

