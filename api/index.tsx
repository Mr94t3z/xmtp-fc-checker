import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
// import { validateFramesPost } from "@xmtp/frames-validator";
// import { Context, Next } from 'hono';

// Uncomment this packages to tested on local server
// import { devtools } from 'frog/dev';
// import { serveStatic } from 'frog/serve-static';

// const xmtpSupport = async (c: Context, next: Next) => {
//   // Check if the request is a POST and relevant for XMTP processing
//   if (c.req.method === "POST") {
//     const requestBody = (await c.req.json().catch(() => {})) || {};
//     if (requestBody?.clientProtocol?.includes("xmtp")) {
//       c.set("client", "xmtp");
//       const { verifiedWalletAddress } = await validateFramesPost(requestBody);
//       c.set("verifiedWalletAddress", verifiedWalletAddress);
//     } else {
//       // Add farcaster check
//       c.set("client", "farcaster");
//     }
//   }
//   await next();
// };

// const addMetaTags = (client: string, version?: string) => {
//   // Follow the OpenFrames meta tags spec
//   return {
//     unstable_metaTags: [
//       { property: `of:accepts`, content: version || "vNext" },
//       { property: `of:accepts:${client}`, content: version || "vNext" },
//     ],
//   };
// };

export const app = new Frog( {
  // ...addMetaTags('xmtp'),
  assetsPath: '/',
  basePath: '/api',
  // Supply a Hub to enable frame verification.
  // hub: neynar({ apiKey: 'NEYNAR_FROG_FM' })
})

// Support Open Frames
app.use(async (c, next) => {

  await next();
  const isFrame = c.res.headers.get('content-type')?.includes('html');
  if (isFrame) {
    let html = await c.res.text();
    const regex = /<meta.*?\/>/gs;
    const matches = [...html.matchAll(regex)];
    let metaTags = matches.map((match) => match[0])?.join?.('');
    /*
    of:image    fc:frame:image
    og:image    og:image
    of:button:$idx    fc:frame:button:index
    of:button:$idx:action    fc:frame:button:$idx:action
    of:button:$idx:target    fc:frame:button:$idx:target
    of:input:text    fc:frame:input:text
    of:image:aspect_ratio    fc:frame:image:aspect_ratio
    of:accepts:farcaster    fc:frame
    of:state    fc:frame:state
    */
    // Complete replacements according to the mapping provided
    let openFrameTags = metaTags
      .replaceAll('fc:frame:image', 'of:image')
      // Assuming a pattern for of:button:$idx replacements
      .replace(/fc:frame:button:(\d+)/g, 'of:button:$1')
      .replace(/fc:frame:button:(\d+):action/g, 'of:button:$1:action')
      .replace(/fc:frame:button:(\d+):target/g, 'of:button:$1:target')
      // Additional replacements based on the provided pattern
      .replaceAll('fc:frame:input:text', 'of:input:text')
      .replaceAll('fc:frame:image:aspect_ratio', 'of:image:aspect_ratio')
      .replaceAll('fc:frame:state', 'of:state');

    openFrameTags += [
      `<meta property="of:accepts:farcaster" content="vNext"/>`,
      `<meta property="of:accepts:xmtp" content="2024-02-01"/>`,
      `<meta property="of:accepts:lens" content="1.1"/>`,
    ].join('\n');

    html = html.replace(/(<head>)/i, `$1${openFrameTags}`);

    c.res = new Response(html, {
      headers: {
        'content-type': 'text/html',
      },
    });
  }
});

app.frame('/', (c) => {
  // XMTP verified address
  const { verifiedWalletAddress } = c?.var || {};

  console.log('verifiedWalletAddress', verifiedWalletAddress)
  
  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(to right, #432889, #17101F)',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          height: '100%',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 60,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 30,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {verifiedWalletAddress}
        </div>
      </div>
    ),
    intents: [
      <Button action="/">Search</Button>,
    ],
  })
})

// Uncomment for local server testing
// devtools(app, { serveStatic });

export const GET = handle(app)
export const POST = handle(app)
