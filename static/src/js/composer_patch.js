import { patch } from "@web/core/utils/patch"
import { Composer } from "@mail/core/common/composer"

const originalNavigableListProps = Object.getOwnPropertyDescriptor(
    Composer.prototype,
    "navigableListProps"
)?.get

// Extend Composer to render our RecordLink suggestions inline
patch(Composer.prototype, {
    get navigableListProps() {
        const items = this.suggestion?.state.items
        if (!items || items.type !== "RecordLink") {
            return originalNavigableListProps ? originalNavigableListProps.call(this) : {}
        }
        // Build minimal props compatible with core NavigableList
        return {
            anchorRef: this.inputContainerRef.el,
            position: this.env.inChatter ? "bottom-fit" : "top-fit",
            onSelect: (ev, option) => {
                this.suggestion.insert(option)
                this.markEventHandled(ev, "composer.selectSuggestion")
            },
            isLoading: !!this.suggestion.search.term && this.suggestion.state.isFetching,
            options: items.suggestions.map((s) => ({
                label: s.group ? `${s.group}: ${s.name}` : s.name,
                record: { id: s.id, name: s.name, model: s.model },
                classList: "o-mail-Composer-suggestion",
            })),
        }
    },
})

