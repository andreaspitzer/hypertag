// hypertag/oembed - an opt-in, pluggable oEmbed provider registry, curated to popular providers
// (25 of the ~380 in oembed.com/providers.json). It maps a page URL to its provider's oEmbed
// endpoint WITHOUT needing the page HTML - the case discovery cannot cover (antibot / JS-rendered
// SPAs like Twitter/X, TikTok, Instagram, whose HTML you cannot scrape anyway). Pure and
// dependency-free: it returns an endpoint URL ready to fetch with hypertag/fetch's oembed().
//
//   const endpoint = oembedEndpoint("https://www.tiktok.com/@user/video/123")
//   const embed = endpoint && (await oembed(endpoint))   // hypertag/fetch
//
// Pass your own `list` to override or extend (e.g. the full providers.json, or your own subset).
// A few providers (Facebook, Instagram) require an access token appended to the request - the
// caller adds that; this only resolves the endpoint.

const providers = [
  {
    name: 'Bluesky Social',
    endpoint: 'https://embed.bsky.app/oembed',
    schemes: ['https://bsky.app/profile/*/post/*']
  },
  {
    name: 'CodePen',
    endpoint: 'https://codepen.io/api/oembed',
    schemes: ['http://codepen.io/*', 'https://codepen.io/*']
  },
  {
    name: 'CodeSandbox',
    endpoint: 'https://codesandbox.io/oembed',
    schemes: ['https://codesandbox.io/s/*', 'https://codesandbox.io/embed/*']
  },
  {
    name: 'Dailymotion',
    endpoint: 'https://www.dailymotion.com/services/oembed',
    schemes: [
      'https://www.dailymotion.com/video/*',
      'https://geo.dailymotion.com/player.html?video=*'
    ]
  },
  {
    name: 'Facebook',
    endpoint: 'https://graph.facebook.com/v16.0/oembed_post',
    schemes: [
      'https://www.facebook.com/*/posts/*',
      'https://www.facebook.com/*/activity/*',
      'https://www.facebook.com/*/photos/*',
      'https://www.facebook.com/photo.php?fbid=*',
      'https://www.facebook.com/photos/*',
      'https://www.facebook.com/permalink.php?story_fbid=*',
      'https://www.facebook.com/media/set?set=*',
      'https://www.facebook.com/questions/*',
      'https://www.facebook.com/notes/*/*/*'
    ]
  },
  {
    name: 'Figma',
    endpoint: 'https://www.figma.com/api/oembed',
    schemes: [
      'https://www.figma.com/file/*',
      'https://www.figma.com/design/*',
      'https://www.figma.com/board/*',
      'https://www.figma.com/slides/*',
      'https://www.figma.com/buzz/*',
      'https://www.figma.com/site/*',
      'https://www.figma.com/make/*'
    ]
  },
  {
    name: 'Flickr',
    endpoint: 'https://www.flickr.com/services/oembed/',
    schemes: [
      'http://*.flickr.com/photos/*',
      'http://flic.kr/p/*',
      'http://flic.kr/s/*',
      'https://*.flickr.com/photos/*',
      'https://flic.kr/p/*',
      'https://flic.kr/s/*',
      'https://*.*.flickr.com/*/*',
      'http://*.*.flickr.com/*/*'
    ]
  },
  {
    name: 'GIPHY',
    endpoint: 'https://giphy.com/services/oembed',
    schemes: [
      'https://giphy.com/gifs/*',
      'https://giphy.com/clips/*',
      'http://gph.is/*',
      'https://media.giphy.com/media/*/giphy.gif'
    ]
  },
  {
    name: 'Instagram',
    endpoint: 'https://graph.facebook.com/v16.0/instagram_oembed',
    schemes: [
      'http://instagram.com/*/p/*',
      'http://www.instagram.com/*/p/*',
      'https://instagram.com/*/p/*',
      'https://www.instagram.com/*/p/*',
      'http://instagram.com/p/*',
      'http://instagr.am/p/*',
      'http://www.instagram.com/p/*',
      'http://www.instagr.am/p/*',
      'https://instagram.com/p/*',
      'https://instagr.am/p/*',
      'https://www.instagram.com/p/*',
      'https://www.instagr.am/p/*',
      'http://instagram.com/tv/*',
      'http://instagr.am/tv/*',
      'http://www.instagram.com/tv/*',
      'http://www.instagr.am/tv/*',
      'https://instagram.com/tv/*',
      'https://instagr.am/tv/*',
      'https://www.instagram.com/tv/*',
      'https://www.instagr.am/tv/*',
      'http://www.instagram.com/reel/*',
      'https://www.instagram.com/reel/*',
      'http://instagram.com/reel/*',
      'https://instagram.com/reel/*',
      'http://instagr.am/reel/*',
      'https://instagr.am/reel/*'
    ]
  },
  {
    name: 'Kickstarter',
    endpoint: 'http://www.kickstarter.com/services/oembed',
    schemes: ['http://www.kickstarter.com/projects/*']
  },
  {
    name: 'Loom',
    endpoint: 'https://www.loom.com/v1/oembed',
    schemes: ['https://loom.com/i/*', 'https://loom.com/share/*']
  },
  {
    name: 'MixCloud',
    endpoint: 'https://www.mixcloud.com/oembed/',
    schemes: ['http://www.mixcloud.com/*/*/', 'https://www.mixcloud.com/*/*/']
  },
  {
    name: 'Pinterest',
    endpoint: 'https://www.pinterest.com/oembed.json',
    schemes: ['https://www.pinterest.com/*']
  },
  {
    name: 'Reddit',
    endpoint: 'https://www.reddit.com/oembed',
    schemes: ['https://reddit.com/r/*/comments/*/*', 'https://www.reddit.com/r/*/comments/*/*']
  },
  {
    name: 'Replit',
    endpoint: 'https://replit.com/data/oembed',
    schemes: ['https://repl.it/@*/*', 'https://replit.com/@*/*']
  },
  {
    name: 'SlideShare',
    endpoint: 'https://www.slideshare.net/api/oembed/2',
    schemes: [
      'https://www.slideshare.net/*/*',
      'http://www.slideshare.net/*/*',
      'https://fr.slideshare.net/*/*',
      'http://fr.slideshare.net/*/*',
      'https://de.slideshare.net/*/*',
      'http://de.slideshare.net/*/*',
      'https://es.slideshare.net/*/*',
      'http://es.slideshare.net/*/*',
      'https://pt.slideshare.net/*/*',
      'http://pt.slideshare.net/*/*'
    ]
  },
  {
    name: 'SoundCloud',
    endpoint: 'https://soundcloud.com/oembed',
    schemes: [
      'http://soundcloud.com/*',
      'https://soundcloud.com/*',
      'https://on.soundcloud.com/*',
      'https://soundcloud.app.goog.gl/*'
    ]
  },
  {
    name: 'Spotify',
    endpoint: 'https://open.spotify.com/oembed',
    schemes: ['https://open.spotify.com/*', 'spotify:*', 'https://spotify.link/*']
  },
  {
    name: 'Streamable',
    endpoint: 'https://api.streamable.com/oembed.json',
    schemes: ['http://streamable.com/*', 'https://streamable.com/*']
  },
  {
    name: 'TikTok',
    endpoint: 'https://www.tiktok.com/oembed',
    schemes: ['https://www.tiktok.com/*', 'https://www.tiktok.com/*/video/*']
  },
  {
    name: 'Tumblr',
    endpoint: 'https://www.tumblr.com/oembed/1.0',
    schemes: ['https://*.tumblr.com/post/*']
  },
  {
    name: 'Twitter',
    endpoint: 'https://publish.twitter.com/oembed',
    schemes: [
      'https://twitter.com/*',
      'https://twitter.com/*/status/*',
      'https://*.twitter.com/*/status/*'
    ]
  },
  {
    name: 'Vimeo',
    endpoint: 'https://vimeo.com/api/oembed.{format}',
    schemes: [
      'https://vimeo.com/*',
      'https://vimeo.com/album/*/video/*',
      'https://vimeo.com/channels/*/*',
      'https://vimeo.com/groups/*/videos/*',
      'https://vimeo.com/ondemand/*/*',
      'https://player.vimeo.com/video/*',
      'https://vimeo.com/event/*/*'
    ]
  },
  {
    name: 'Wistia, Inc.',
    endpoint: 'https://fast.wistia.com/oembed.{format}',
    schemes: [
      'https://fast.wistia.com/embed/iframe/*',
      'https://fast.wistia.com/embed/playlists/*',
      'https://*.wistia.com/medias/*',
      'https://*.wistia.com/s/*'
    ]
  },
  {
    name: 'YouTube',
    endpoint: 'https://www.youtube.com/oembed',
    schemes: [
      'https://*.youtube.com/watch*',
      'https://*.youtube.com/v/*',
      'https://youtu.be/*',
      'https://*.youtube.com/playlist?list=*',
      'https://youtube.com/playlist?list=*',
      'https://*.youtube.com/shorts*',
      'https://youtube.com/shorts*',
      'https://*.youtube.com/embed/*',
      'https://*.youtube.com/live*',
      'https://youtube.com/live*'
    ]
  }
]

// Resolve the oEmbed endpoint for `url` from `list` (default: the curated providers), or null
// when none matches. The result is ready to fetch: the target is added as url=, format=json.
function oembedEndpoint(url, list = providers) {
  if (typeof url !== 'string') return null
  for (const provider of list) {
    for (const scheme of provider.schemes) {
      if (schemeToRegExp(scheme).test(url)) {
        const base = provider.endpoint.replace('{format}', 'json')
        const sep = base.includes('?') ? '&' : '?'
        return `${base}${sep}format=json&url=${encodeURIComponent(url)}`
      }
    }
  }
  return null
}

// An oEmbed URL scheme (with `*` wildcards) as an anchored RegExp. Compiled per call - the list is
// short and this runs once per lookup, so there is no module-level state to grow.
function schemeToRegExp(scheme) {
  return new RegExp(`^${scheme.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
}

// The default export stays the callable `oembedEndpoint`, with `providers` attached as a
// property for parity with the previous CommonJS shape.
Object.assign(oembedEndpoint, {oembedEndpoint, providers})

export default oembedEndpoint
export {oembedEndpoint, providers}
