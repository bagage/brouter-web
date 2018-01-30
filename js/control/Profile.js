BR.Profile = L.Class.extend({
    cache: {},

    initialize: function () {
        L.DomUtil.get('upload').onclick = L.bind(this._upload, this);
        L.DomUtil.get('clear').onclick = L.bind(this.clear, this);
        this.profile_textarea = L.DomUtil.get('profile_upload');
        autosize(this.profile_textarea);
        this.message = new BR.Message('profile_message', {
            alert: true
        });
    },

    clear: function(evt) {
        var button = evt.target || evt.srcElement;

        evt.preventDefault();
        this.profile_textarea.value = null;
        this.profile_textarea.defaultValue = null;
        autosize.update(this.profile_textarea);

        this.fire('clear');
        button.blur();
    },

    update: function(options) {
        var profileName = options.profile,
            profile_textarea = this.profile_textarea,
            profile_was_customized = (profile_textarea.value && profile_textarea.defaultValue && profile_textarea.defaultValue !== profile_textarea.value);
        
        this.profileName = profileName;
        if (profileName && !profile_was_customized) {
            if (!(profileName in this.cache)) {
                console.log("Profile", profileName, "is not available in cache, trying to download it…")
                var mustUpload, profileUrl;
                if (BR.conf.profilesExtra.includes(profileName)) {
                    if (BR.conf.profilesExtraUrl === undefined) {
                        console.error('profilesExtraUrl is not defined in config.js');
                        return;
                    }
                    profileUrl = BR.conf.profilesExtraUrl + profileName + '.brf';                    
                    mustUpload = true;
                } else if (BR.conf.profiles.includes(profileName)) {
                    profileUrl = BR.conf.profilesUrl + profileName + '.brf';
                    if (BR.conf.profilesUrl === undefined) {
                        console.error('profilesUrl is not defined in config.js');
                        return;
                    }
                    mustUpload = false;
                } else {
                    new Error('This profile "' + profileName + '" is unknown');
                    return;
                }

                // try to download the profile from the server
                console.log("Downloading profile from", profileUrl)
                BR.Util.get(profileUrl, L.bind(function(err, profileText) {
                    if (err) {
                        console.warn('Error getting profile from"' + profileUrl + '": ' + err);
                        return;
                    }

                    this.cache[profileName] = profileText;

                    // don't set when option has changed while loading
                    if (!this.profileName || this.profileName === profileName) {
                        profile_textarea.value = profileText;
                        profile_textarea.defaultValue = profile_textarea.value;
                        autosize.update(this.profile_textarea);
                        if (mustUpload) {
                            console.log("Uploading profile…")
                            $('#upload').click();
                        }
                    }
                }, this));
            } else {
                console.log("Profile", profileName, "found in case, using it")
                profile_textarea.value = this.cache[profileName];
                profile_textarea.defaultValue = profile_textarea.value;
                autosize.update(this.profile_textarea);
            }
        } else if (profileName) {
            console.log("No need to download", profileName, ": user customized profile")
        } else {
            console.log("No need to download profile, none is set yet")
        }
    },

    _upload: function(evt) {
        var button = evt.target || evt.srcElement,
            profile = this.profile_textarea.value;

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
    }
});

BR.Profile.include(L.Mixin.Events);
