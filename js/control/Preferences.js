BR.Preferences = L.Class.extend({
    initialize: function() {
        $('#preferences').on(
            'show.bs.modal',
            L.bind(function(event) {
                this._fillForm();
            }, this)
        );
    },

    _addSelectOption: function(select, label, value, selected) {
        var option = document.createElement('option');
        option.value = value;
        option.selected = selected;
        option.append(label);
        select.appendChild(option);
    },

    _fillForm: function() {
        var langSelect = document.getElementById('langSelect');
        for (var langIdx in i18next.languages) {
            var lang = i18next.languages[langIdx];
            this._addSelectOption(langSelect, lang, lang, lang === i18next.language);
        }
    },

    _persistPreferences: function() {
        if (!BR.Util.localStorageAvailable()) return;
    }
});

BR.settings = function() {
    return new BR.Settings();
};
