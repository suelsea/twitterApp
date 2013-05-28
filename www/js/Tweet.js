var Tweet = Model.create(
{
  id: Model.ROProperty("id_str"),
  text: Model.ROProperty,
  created_at: Model.ROProperty,
  cards: Model.ROProperty,

  constructor: function(__super, values, account, reduce)
  {
    this._account = account
    if (reduce === true)
    {
      __super(this._reduce(values));
    }
    else
    {
      __super(values);
    }
    this._buildImageUrl();
  },

  _reduce: function(values)
  {
    var r = {
      id_str: values.id_str,
      entities: values.entities,
      text: values.text,
      user: values.user && { name: values.user.name, screen_name: values.user.screen_name, id_str: values.user.id_str, lang: values.user.lang },
      sender: values.sender && { name: values.sender.name, screen_name: values.sender.screen_name, id_str: values.sender.id_str, lang: values.sender.lang },
      recipient: values.recipient && { name: values.recipient.name, screen_name: values.recipient.screen_name, id_str: values.recipient.id_str, lang: values.recipient.lang },
      from_user_name: values.from_user_name,
      from_user: values.from_user,
      from_user_id_str: values.from_user_id_str,
      iso_language_code: values.iso_language_code,
      profile_image_url: values.profile_image_url,
      created_at: values.created_at,
      favorited: values.favorited,
      retweeted_of_me: values.retweeted_of_me || (values.retweeted_status && values.retweeted_status.user.screen_name === this._account.lc_screen_name),
      place: values.place && { full_name: values.place.full_name, id: values.place.id },
      geo: values.geo && { coordinates: values.geo.coordinates },
      retweeted_status: values.retweeted_status && this._reduce(values.retweeted_status),
      in_reply_to_status_id_str: values.in_reply_to_status_id_str,
      is_search: values.is_search,
      cards: values.cards || null
    };
    if (!r.cards)
    {
      var v = r.retweeted_status || r;
      var m = v.entities && v.entities.media;
      if (m && m.length)
      {
        for (var i = m.length - 1; i >= 0; i--)
        {
          var media = m[i];
          if (media.type === "photo" || media.type === "video")
          {
            r.cards =
            {
              photos:
              [
                {
                  // url
                  // title
                  // description
                  // author_user
                  // site_user
                  images:
                  {
                    mobile:
                    {
                      image_url_2x: media.media_url + (media.sizes ? ":small" : "")
                    },
                    web:
                    {
                      image_url_2x: media.media_url
                    }
                  }
                }
              ]
            };
            break;
          }
        }
      }
    }
    return r;
  },

  entifiedText: function()
  {
    if (!this._text)
    {
      var entities = this._values.entities;
      if (entities)
      {
        var txt = [ { type: "text", value: this._values.text, length: this._values.text.length } ];
        function split(type, entityset)
        {
          if (entityset)
          {
            for (var i = entityset.length - 1; i >= 0; i--)
            {
              var entity = entityset[i];
              var start = entity.indices[0];
              var length = entity.indices[1] - start;
              var offset = 0;
              for (var ti = 0, tlen = txt.length; ti < tlen; ti++)
              {
                var t = txt[ti];
                if (t.type == "text" && start >= offset && start + length <= offset + t.length)
                {
                  if (start == offset && length == t.length)
                  {
                    t.type = type;
                    t.entity = entity;
                  }
                  else
                  {
                    var nt = { type: type, value: t.value.substr(start - offset, length), length: length, entity: entity };
                    if (start == offset)
                    {
                      t.value = t.value.substr(length);
                      t.length = t.value.length;
                      txt.splice(ti, 0, nt);
                    }
                    else if (start - offset + length == t.length)
                    {
                      t.value = t.value.substr(0, start - offset);
                      t.length = t.value.length;
                      txt.splice(ti + 1, 0, nt);
                    }
                    else
                    {
                      var end = { type: "text", value: t.value.substr(start + length - offset), length: 0 };
                      end.length = end.value.length;
                      t.value = t.value.substr(0, start - offset);
                      t.length = t.value.length;
                      txt.splice(ti + 1, 0, nt, end);
                    }
                  }
                  break;
                }
                else
                {
                  offset += t.length;
                }
              }
            }
          }
        }
        split("media", entities.media);
        split("url", entities.urls);
        split("user_mentions", entities.user_mentions);
        split("hashtags", entities.hashtags);

        function durl(t)
        {
          return t.entity.resolved_display_url || t.entity.display_url || t.entity.expanded_url || t.entity.url;
        }

        var text = "";
        for (var i = 0, len = txt.length; i < len; i++)
        {
          var t = txt[i];
          switch (t.type)
          {
            case "media":
              text += '<span class="media" data-action-click="Image" data-href="' + t.entity.media_url + '" data-full-href="' + (t.entity.resolved_url || t.entity.url) + '">' + durl(t) + '</span>';
              break;
            case "url":
              text += '<span class="url" data-action-click="Url" data-href="' + t.entity.url + '" title="' + (t.entity.resolved_url || t.entity.url) +'">' + durl(t) + '</span>';
              break;
            case "user_mentions":
              text += '<span class="user_mention" data-action-click="Mention" data-name="' + t.value + '">' + t.value + '</span>';
              break;
            case "hashtags":
              text += '<span class="hashtag" data-action-click="Hashtag">' + t.value + '</span>';
              break;
            default:
              text += t.value;
              break;
          }
        }
        this._text = text;
      }
      else
      {
        this._text = this._values.text;
      }
    }
    return this._text;
  },

  name: function()
  {
    if (this._values.user)
    {
      return this._values.user.name;
    }
    else if (this._values.sender)
    {
      return this._values.sender.name;
    }
    else
    {
      return this._values.from_user_name;
    }
  },

  screen_name: function()
  {
    if (this._values.user)
    {
      return this._values.user.screen_name;
    }
    else if (this._values.sender)
    {
      return this._values.sender.screen_name;
    }
    else
    {
      return this._values.from_user;
    }
  },

  at_screen_name: function()
  {
    return "@" + this.screen_name();
  },

  conversation_name: function()
  {
    if (this._values.user)
    {
      return this._values.user.name;
    }
    else if (this._values.sender)
    {
      if (this._values.sender.screen_name.toLowerCase() === this._account.lc_screen_name)
      {
        return this._values.recipient.name;
      }
      else
      {
        return this._values.sender.name;
      }
    }
    else
    {
      return this._values.from_user_name;
    }
  },

  conversation_screen_name: function()
  {
    if (this._values.user)
    {
      return this._values.user.screen_name;
    }
    else if (this._values.sender)
    {
      if (this._values.sender.screen_name.toLowerCase() === this._account.lc_screen_name)
      {
        return this._values.recipient.screen_name;
      }
      else
      {
        return this._values.sender.screen_name;
      }
    }
    else
    {
      return this._values.from_user;
    }
  },
  
  profile_image_url: function()
  {
    return this._profile_image_url;
  },

  user: function()
  {
    if (this._values.user)
    {
      return this._values.user;
    }
    else if (this._values.sender)
    {
      if (this._values.sender.screen_name.toLowerCase() === this._account.lc_screen_name)
      {
        return this._values.recipient;
      }
      else
      {
        return this._values.sender;
      }
    }
    else
    {
      return this._values;
    }
  },

  _buildImageUrl: function()
  {
    if (this.isDM())
    {
      Co.Routine(this,
        function()
        {
          return Composite.mergeIcons("http://api.twitter.com/1/users/profile_image/" + this._values.recipient.screen_name + Tweet.profileImgExt, "http://api.twitter.com/1/users/profile_image/" + this._values.sender.screen_name + Tweet.profileImgExt, 48, 32, 5);
        },
        function(url)
        {
          this._profile_image_url = url();
          this.emit("update");
        }
      );
    }
    else
    {
      this._profile_image_url = "http://api.twitter.com/1/users/profile_image/" + this.screen_name() + Tweet.profileImgExt;
    }
  },

  urls: function()
  {
    var urls = [];
    var entities = this._values.entities;
    if (entities)
    {
      entities.urls && entities.urls.forEach(function(url)
      {
        url.expanded_url && urls.push(url.expanded_url);
      }, this);
      entities.media && entities.media.forEach(function(media)
      {
        urls.push(media.media_url + (media.sizes ? ":small" : ""));
      }, this);
    }
    return urls;
  },

  oembeds: function(oembeds)
  {
    if (!this._values.cards)
    {
      var entities = this._values.entities;
      if (entities)
      {
        var urls = entities.urls;
        for (var i = urls.length - 1; i >= 0; i--)
        {
          var url = urls[i];
          var cards = url.expanded_url && oembeds[url.expanded_url];
          if (cards)
          {
            if (cards.url)
            {
              url.resolved_url = cards.url;
              url.resolved_display_url = this._make_display_url(cards.url);
              this._tags = null;
              this._tagsHash = null;
            }
            if (cards.photos || cards.videos)
            {
              this._values.cards = cards;
              this._tags = null;
              this._tagsHash = null;
            }
            break;
          }
        }
      }
    }
  },

  created_at: function()
  {
    return this._values.created_at;
  },

  created_since: function()
  {
    return Tweet.tweetTime(this._values.created_at);
  },

  is_my_tweet: function()
  {
    if (this._values.user)
    {
      return this._values.user.screen_name.toLowerCase() === this._account.lc_screen_name;
    }
    else
    {
      return false;
    }
  },

  isDM: function()
  {
    return this.hasTagKey(Tweet.DMTag.hashkey);
  },

  isMention: function()
  {
    return this.hasTagKey(Tweet.MentionTag.hashkey);
  },

  isSearch: function()
  {
    return this._values.is_search || false;
  },

  hasTagKey: function(key)
  {
    return this.tagsHash()[key] || false;
  },

  favorited: function(nv)
  {
    var model = this.is_retweet() ? this.retweet() : this;
    if (arguments.length)
    {
      var ov = Model.updateProperty(model, "favorited", nv);
      if (ov !== nv)
      {
        this._tags = null;
        this._tagsHash = null;
        this.emit("update.favorited");
        this.emit("update");
      }
      return ov;
    }
    else
    {
      return Model.updateProperty(model, "favorited");
    }
  },

  retweeted_of_me: function(nv)
  {
    var model = this.is_retweet() ? this.retweet() : this;
    if (arguments.length)
    {
      var ov = Model.updateProperty(model, "retweeted_of_me", nv);
      if (ov != nv)
      {
        this._tags = null;
        this._tagsHash = null;
        this.emit("update.retweeted_of_me");
        this.emit("update");
      }
      return ov;
    }
    else
    {
      return Model.updateProperty(model, "retweeted_of_me");
    }
  },

  from_friend: function()
  {
    return this._account._fetcher.isFriend(this.is_retweet() ? this.retweet().user() : this.user());
  },

  tags: function()
  {
    if (!this._tags)
    {
      this._buildTags();
    }
    return this._tags;
  },

  tagsHash: function()
  {
    if (!this._tags)
    {
      this._buildTags();
    }
    return this._tagsHash;
  },

  tagkeys: function()
  {
    if (!this._tags)
    {
      this._buildTags();
    }
    if (!this._tagkeys)
    {
      var keys = "";
      this._tags.forEach(function(key)
      {
        switch (key.type)
        {
          case "screenname":
          case "hashtag":
          case "hostname":
          case "topic":
          case "lang":
            keys += key.key + " ";
          default:
            break;
        }
      });
      this._tagkeys = keys.slice(0, -1);
    }
    return this._tagkeys;
  },

  _buildTags: function()
  {
    var me = this._account.tweetLists.screenname;
    var used = {};
    var tags = [];
    if (this.is_retweet())
    {
      var retweet = this.retweet();
      retweet._buildTags();
      tags = retweet._tags;
      used = retweet._tagsHash;
      retweet._tags = null;
      retweet._tagsHash = null;
      var name = this.at_screen_name();
      var key = name.toLowerCase();
      if (!used["screenname:" + key])
      {
        tags.unshift({ title: name, type: "screenname", key: key });
        used["screenname:" + key] = true;
        this._account.userAndTags.addUser(this.screen_name(), this.name());
      }
      delete used[Tweet.TweetTag.hashkey];
      used[Tweet.RetweetTag.hashkey] = true;
      tags[tags.length - 1] = Tweet.RetweetTag;
    }
    else
    {
      var name = this.at_screen_name();
      var key = name.toLowerCase();
      used["screenname:" + key] = true;
      tags.push({ title: name, type: "screenname", key: key });
      this._account.userAndTags.addUser(this.screen_name(), this.name());
      if (key === me)
      {
        used[Tweet.MentionTag.hashkey] = true;
        tags.push(Tweet.MentionTag);
      }

      Topics.lookupByScreenName(key).forEach(function(topic)
      {
        var key = topic.title.toLowerCase();
        used["topic:" + key] = true;
        tags.push({ title: topic.title, type: "topic", key: key });
      });

      var recipient = this._values.recipient;
      if (recipient)
      {
        var name = "@" + recipient.screen_name;
        var key = name.toLowerCase();
        used["screenname:" + key] = true;
        tags.push({ title: name, type: "screenname", key: key });
        this._account.userAndTags.addUser(recipient.screen_name, recipient.name);
      }

      var entities = this._values.entities;
      if (entities)
      {
        entities.user_mentions && entities.user_mentions.forEach(function(mention)
        {
          var name = "@" + mention.screen_name;
          var key = name.toLowerCase();
          if (!used["screenname:" + key])
          {
            used["screenname:" + key] = true;
            tags.push({ title: name, type: "screenname", key: key });
            this._account.userAndTags.addUser(mention.screen_name, mention.name);
            if (key === me && !used[Tweet.MentionTag.hashkey])
            {
              used[Tweet.MentionTag.hashkey] = true;
              tags.push(Tweet.MentionTag);
            }
          }
        }, this);
        entities.hashtags && entities.hashtags.forEach(function(hashtag)
        {
          var key = "#" + hashtag.text.toLowerCase();
          if (!used["hashtag:" + key])
          {
            used["hashtag:" + key] = true;
            tags.push({ title: "#" + hashtag.text, type: "hashtag", key: key });
            this._account.userAndTags.addHashtag(hashtag.text);
          }
        }, this);
        entities.urls && entities.urls.forEach(function(url)
        {
          url = url.resolved_url || url.expanded_url;
          if (url)
          {
            var hostname = new Url(url).hostname.toLowerCase();
            if (!used["hostname:" + hostname])
            {
              used["hostname:" + hostname] = true;
              tags.push({ title: hostname, type: "hostname", key: hostname });
            }
          }
        });
        entities.media && entities.media.forEach(function(media)
        {
          var url = media.resolved_url || media.expanded_url;
          if (url)
          {
            if (media.type === "photo" && !used[Tweet.PhotoTag.hashkey])
            {
              used[Tweet.PhotoTag.hashkey] = true;
              tags.push(Tweet.PhotoTag);
            }
            else if (media.type === "video" && !used[Tweet.VideoTag.hashkey])
            {
              used[Tweet.VideoTag.hashkey] = true;
              tags.push(Tweet.VideoTag);
            }
            var hostname = new Url(url).hostname.toLowerCase();
            if (!used["hostname:" + hostname])
            {
              used["hostname:" + hostname] = true;
              tags.push({ title: hostname, type: "hostname", key: hostname });
            }
          }
        });
      }
      if (this._values.cards)
      {
        var cards = this._values.cards;
        if (cards.photos && !used[Tweet.PhotoTag.hashkey])
        {
          used[Tweet.PhotoTag.hashkey] = true;
          tags.push(Tweet.PhotoTag);
        }
        if (cards.videos && !used[Tweet.VideoTag.hashkey])
        {
          used[Tweet.VideoTag.hashkey] = true;
          tags.push(Tweet.VideoTag);
        }
      }

      if (this._values.place)
      {
        var name = this._values.place.full_name;
        used[Tweet.PlaceTag.hashkey] = true;
        tags.push({ title: name, type: "somewhere", key: "place:" + this._values.place.id });
        tags.push(Tweet.PlaceTag);
      }
      else if (this._values.geo)
      {
        var co = this._values.geo.coordinates;
        var name = co[0] + "," + co[1];
        used[Tweet.GeoTag.hashkey] = true;
        tags.push({ title: name, type: "somewhere", key: 'near:"' + name + '"' });
        tags.push(Tweet.GeoTag);
      }
      if (this.favorited())
      {
        used[Tweet.FavoriteTag.hashkey] = true;
        tags.push(Tweet.FavoriteTag);
      }
      if (this.retweeted_of_me())
      {
        used[Tweet.RetweetedTag.hashkey] = true;
        tags.push(Tweet.RetweetedTag);
      }
      if (!this.from_friend())
      {
        used[Tweet.StrangerTag.hashkey] = true;
        tags.push(Tweet.StrangerTag);
      }
      var u = this._values.user || this._values.sender;
      if (u && u.lang && u.lang !== Tweet.language)
      {
        used["lang:" + u.lang] = true;
        tags.push({ title: u.lang, type: "lang", key: u.lang });
      }
      else if (this._values.iso_language_code && this._values.iso_language_code !== Tweet.language)
      {
        used["lang:" + this._values.iso_language_code] = true;
        tags.push({ title: this._values.iso_language_code, type: "lang", key: this._values.iso_language_code });
      }
      if (this._values.recipient)
      {
        used[Tweet.DMTag.hashkey] = true;
        tags.push(Tweet.DMTag);
      }
      else
      {
        used[Tweet.TweetTag.hashkey] = true;
        tags.push(Tweet.TweetTag);
      }
    }
    this._tags = tags;
    this._tagsHash = used;
  },

  is_retweet: function()
  {
    return this._values.retweeted_status ? true : false;
  },

  retweet: function()
  {
    if (this._retweet === undefined)
    {
      var rt = this._values.retweeted_status;
      this._retweet = rt ? new Tweet(rt, this._account, false) : false;
    }
    return this._retweet;
  },

  in_reply_to: function()
  {
    if (this._replytweet === undefined)
    {
      this._replytweet = null;
      var rid = this._values.in_reply_to_status_id_str;
      if (rid)
      {
        var reply = this._account.tweetLists.getTweet(rid);
        if (reply)
        {
          this._replytweet = reply;
        }
      }
    }
    return this._replytweet;
  },

  _make_display_url: function(url)
  {
    url = new Url(url);
    var fullname = url.pathname + url.search + url.hash;
    var pathname = fullname.slice(0, 15);
    return url.hostname + pathname + (fullname === pathname ? "" : "...");
  },

  match: function(query)
  {
    return (this.is_retweet() ? this.retweet() : this).text().toLowerCase().indexOf(query) !== -1;
  }
}).statics(
{
  language: navigator.language.split("-")[0],

  profileImgExt: Environment.isRetina() ? ".png?size=bigger" : ".png",

  tweetTime: function(created_at, type)
  {
    type && (type.relative = true);
    var date = new Date(created_at);
    var since = parseInt((Date.now() - date.getTime()) / 1000);
    if (since < 60)
    {
      return since + "s";
    }
    since = parseInt(since / 60);
    if (since < 60)
    {
      return since + "m";
    }
    since = parseInt(since / 60);
    if (since < 24)
    {
      return since + "h";
    }
    else
    {
      type && (type.relative = false);
      date = date.toDateString().split(" ");
      return date[1] + " " + date[2];
    }
  },

  compareTweets: function(a, b)
  {
    return Tweet.compareTweetIds(a.id(), b.id());
  },

  compareRawTweets: function(a, b)
  {
    return Tweet.compareTweetIds(a.id_str, b.id_str);
  },

  compareTweetIds: function(aid, bid)
  {
    var aidl = aid.length;
    var bidl = bid.length;
    if (aidl < bidl)
    {
      return 1;
    }
    else if (aidl > bidl)
    {
      return -1;
    }
    else if (aid < bid)
    {
      return 1;
    }
    else if (aid > bid)
    {
      return -1;
    }
    else
    {
      return 0;
    }
  },

  hasHashtag: function(tweet, tags)
  {
    var hashtags = tweet.entities && tweet.entities.hashtags;
    if (hashtags)
    {
      for (var i = hashtags.length - 1; i >= 0; i--)
      {
        if (tags.indexOf(hashtags[i].text.toLowerCase()) !== -1)
        {
          return true;
        }
      }
    }
    return false;
  },

  TweetTag: { title: "Tweet", type: "tweet", key: "tweet", hashkey: "tweet:tweet" },
  RetweetTag: { title: "Retweet", type: "retweet", key: "retweet", hashkey: "retweet:retweet" },
  RetweetedTag: { title: "Retweeted", type: "retweeted", key: "retweeted", hashkey: "retweeted:retweeted" },
  MentionTag: { title: "Mention", type: "mention", key: "mention", hashkey: "mention:mention" },
  DMTag: { title: "DM", type: "dm", key: "dm", hashkey: "dm:dm" },
  FavoriteTag: { title: "Favorite", type: "fav", key: "favorite", hashkey: "fav:favorite" },
  PhotoTag: { title: "Photo", type: "topic", key: "photo", hashkey: "topic:photo" },
  VideoTag: { title: "Video", type: "topic", key: "video", hashkey: "topic:video" },
  PlaceTag: { title: "Place", type: "topic", key: "place", hashkey: "topic:place" },
  GeoTag: { title: "Geo", type: "topic", key: "geo", hashkey: "topic:geo" },
  StrangerTag: { title: "Stranger", type: "stranger", key: "stranger", hashkey: "stranger:stranger" }
});
