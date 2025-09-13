import { SuggestionService } from "@mail/core/common/suggestion_service"
import { cleanTerm } from "@mail/utils/common/format"
import { _t } from "@web/core/l10n/translation"
import { patch } from "@web/core/utils/patch"

const MODELS = [
    { label: _t("Products"), model: "product.product" },
    { label: _t("Motors"), model: "motor" },
]

function parseModelAndQuery(term) {
    const t = cleanTerm((term || "").trimStart())
    const m = t.match(/^(pro|product|mot|motor)\s+(.*)$/)
    if (m) {
        const key = m[1]
        const q = m[2] || ""
        if (key === "pro" || key === "product") return { model: "product.product", q }
        if (key === "mot" || key === "motor") return { model: "motor", q }
    }
    return { model: null, q: t }
}

patch(SuggestionService.prototype, {
    getSupportedDelimiters(thread) {
        const res = super.getSupportedDelimiters(thread)
        // Accept "[" anywhere (whitespace-before behavior handled by core)
        const out = res.slice()
        out.push(["["])
        return out
    },

    async fetchSuggestions({ delimiter, term }, { abortSignal } = {}) {
        if (delimiter !== "[") {
            return super.fetchSuggestions(...arguments)
        }
        const { model: modelFilter, q: search } = parseModelAndQuery(term)
        this.__recordLinkCache = []
        // Aggregate top results per model
        for (const m of MODELS) {
            if (modelFilter && m.model !== modelFilter) continue
            try {
                let pairs = []
                if (m.model === "motor" && search) {
                    const tokens = search.trim().split(/\s+/).filter(Boolean)
                    // Build domain: AND across tokens, each token OR across fields
                    let domain = []
                    for (const t of tokens) {
                        const or = [
                            "|", "|", "|", "|",
                            ["motor_number", "ilike", t],
                            ["model", "ilike", t],
                            ["year", "ilike", t],
                            ["configuration", "ilike", t],
                            ["manufacturer", "ilike", t],
                        ]
                        domain = domain.length ? ["&", domain, or] : or
                    }
                    const recs = await this.makeOrmCall(
                        m.model,
                        "search_read",
                        [domain, ["display_name"], 0, 8],
                        {},
                        { abortSignal }
                    )
                    pairs = recs.map(r => [r.id, r.display_name])
                } else {
                    const result = await this.makeOrmCall(
                        m.model,
                        "name_search",
                        [search, [], "ilike", 8],
                        {},
                        { abortSignal }
                    )
                    pairs = result
                }
                for (const [id, name] of pairs) {
                    this.__recordLinkCache.push({ id, name, model: m.model, label: name, group: m.label })
                }
            } catch (e) {
                // best effort; ignore per-model failures
            }
        }
    },

    searchSuggestions({ delimiter, term }, { sort = false } = {}) {
        if (delimiter !== "[") {
            return super.searchSuggestions(...arguments)
        }
        const { model: modelFilter, q: cleaned } = parseModelAndQuery(term)
        let suggestions = (this.__recordLinkCache || []).filter((s) => {
            if (modelFilter && s.model !== modelFilter) return false
            return cleanTerm(s.name).includes(cleaned)
        })
        if (sort) {
            suggestions = suggestions.sort((a, b) => {
                const an = cleanTerm(a.name)
                const bn = cleanTerm(b.name)
                if (an.startsWith(cleaned) && !bn.startsWith(cleaned)) return -1
                if (!an.startsWith(cleaned) && bn.startsWith(cleaned)) return 1
                return an.localeCompare(bn) || a.id - b.id
            })
        }
        return { type: "RecordLink", suggestions }
    },
})

