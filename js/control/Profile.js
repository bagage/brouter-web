BR.Profile = L.Evented.extend({
    cache: {},

    initialize: function () {
        var textArea = L.DomUtil.get('profile_upload');
        this.editor = CodeMirror.fromTextArea(textArea, {});

        L.DomUtil.get('upload').onclick = L.bind(this._upload, this);
        L.DomUtil.get('clear').onclick = L.bind(this.clear, this);
        this.message = new BR.Message('profile_message', {
            alert: true
        });
    },

    clear: function(evt) {
        var button = evt.target || evt.srcElement;

        evt.preventDefault();
        this._setValue("");

        this.fire('clear');
        button.blur();
    },

    update: function(options) {
        var profileName = options.profile,
            profileUrl,
            empty = !this.editor.getValue(),
            clean = this.editor.isClean();
            profileWasCustomized = (!empty && !clean 
                && (!(profileName in this.cache) || this.editor.getValue() !== this.cache[profileName]));
        
        this.profileName = profileName;
        if (profileName && !profileWasCustomized) {
            if (!(profileName in this.cache)) {
                console.log("Profile", profileName, "is not available in cache, trying to download it…")
                var mustUpload, profileUrl;
                if (Object.values(BR.conf.profilesExtra).includes(profileName)) {
                    if (BR.conf.profilesExtraUrl === undefined) {
                        console.error('profilesExtraUrl is not defined in config.js');
                        return;
                    }
                    profileUrl = BR.conf.profilesExtraUrl + profileName + '.brf';                    
                    mustUpload = true;
                } else if (BR.conf.profilesUrl && Object.values(BR.conf.profiles).includes(profileName)) {
                    profileUrl = BR.conf.profilesUrl + profileName + '.brf';
                    if (BR.conf.profilesUrl === undefined) {
                        console.error('profilesUrl is not defined in config.js');
                        return;
                    }
                    mustUpload = false;
                } else {
                    console.error('This profile "' + profileName + '" is unknown');
                    return;
                }

                // try to download the profile from the server
                console.log("Downloading profile from", profileUrl)
                BR.Util.get(profileUrl, L.bind(function(err, profileText) {
                    if (err) {
                        console.warn('Error getting profile from"' + profileUrl + '": ' + err);
                        BR.message.showError(new Error('Cannot download profile "' + profileName + '"'))
                        return;
                    }

                    if (!mustUpload) {
                       this.cache[profileName] = profileText;
                    }
                    // don't set when option has changed while loading
                    if (!this.profileName || this.profileName === profileName) {
                        this._setValue(profileText);
                        if (mustUpload) {
                            console.log("Uploading profile…")
                            $('#upload').click();
                        }
                    }
                }, this));
            } else {
                console.log("Profile", profileName, "found in cache, using it")
                this._setValue(this.cache[profileName]);
            }
        } else if (profileName) {
            console.log("No need to download", profileName, ": user customized profile")
        } else {
            console.log("No need to download profile, none is set yet")
        }
    },

    show: function() {
        this.editor.refresh();
    },

    _upload: function(evt) {
        var button = evt.target || evt.srcElement,
            profile = this.editor.getValue();

        this.message.hide();
        $(button).button('uploading');
        evt.preventDefault();

        this.fire('update', {
            profileText: profile,
            callback: function () {
                $(button).button('reset');
                $(button).blur();
            }
        });
    },
    
    _setValue: function(profileText) {
        this.editor.setValue(profileText);
        this.editor.markClean();
    }
});
