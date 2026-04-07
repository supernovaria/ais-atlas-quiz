/**
 * Cloudflare Pages Function — GET /audio/rss
 * Returns a valid podcast RSS feed for the AI Safety Atlas audio.
 */

const AUDIO_BASE = "https://atlas.foreviewusercontent.com/audio";

const EPISODES = [
  {
    index: "4.1",
    title: "4.1 Introduction",
    description: "An introduction to AI governance: what it is, why it matters, and the key challenges ahead.",
    filename: "atlas-ch4-s1-ec7a7293ee7e911a5d063e8dc666b90a6c46d3204f9594b3de854db71609164d.mp3",
    duration: "00:02:05",
    length: 1394780,
  },
  {
    index: "4.2",
    title: "4.2 Governance Problems",
    description: "The core problems that AI governance must address, including coordination failures and regulatory challenges.",
    filename: "atlas-ch4-s2-fdf3f7afa98e48b5bd5d64c54186ab6e79dcfc58ffa218807a71aaec6a39af6c.mp3",
    duration: "00:09:20",
    length: 6604892,
  },
  {
    index: "4.3",
    title: "4.3 Compute Governance",
    description: "How controlling access to compute hardware can serve as a lever for AI governance.",
    filename: "atlas-ch4-s3-94cbd4ba8fb45f4dae7da41e36f10bc080994c0949dc4b9d4b2202faea9ca1fe.mp3",
    duration: "00:16:48",
    length: 11775740,
  },
  {
    index: "4.4",
    title: "4.4 Systemic Challenges",
    description: "The systemic and structural challenges facing effective AI governance at scale.",
    filename: "atlas-ch4-s4-31d32e6bf62c1844fec667198d3cdf4ebbaef4923be741f8d9bbb27cd0c544a2.mp3",
    duration: "00:24:22",
    length: 17103572,
  },
  {
    index: "4.5",
    title: "4.5 Governance Architectures",
    description: "Different architectural approaches to governing AI systems and institutions.",
    filename: "atlas-ch4-s5-906d74c1523a40c5b18e8bb16c4a9e2871d2a1129ff30a7094274f855e70d7b1.mp3",
    duration: "00:41:43",
    length: 29488076,
  },
  {
    index: "4.6",
    title: "4.6 Implementation",
    description: "Practical implementation paths for AI governance frameworks and policies.",
    filename: "atlas-ch4-s6-aae267373d5dbc3a2fdb71e8cc4d16fb91d18bd6fbc849861bd3ccdd99a5e53b.mp3",
    duration: "00:16:08",
    length: 11460548,
  },
  {
    index: "4.7",
    title: "4.7 Conclusion",
    description: "Key takeaways and conclusions from the AI governance chapter.",
    filename: "atlas-ch4-s7-bfbbd4026aa9f112a16fff2c3eae27767133de03091b873b677f9b097f28618f.mp3",
    duration: "00:04:36",
    length: 3286028,
  },
  {
    index: "4.8",
    title: "4.8 Appendix: Data Governance",
    description: "Appendix covering data governance as a complement to AI governance.",
    filename: "atlas-ch4-s8-ddb124285813a54faa9a61a02163b5754c1cc7810a0aaeebeab01bc0ac41e3a2.mp3",
    duration: "00:04:49",
    length: 3350396,
  },
  {
    index: "4.9",
    title: "4.9 Appendix: National Governance",
    description: "Appendix covering national-level approaches to AI governance across different countries.",
    filename: "atlas-ch4-s9-9e8958c10ecebec7580a66ce243e9c51c153688fdf986f6dcabf764af0d07a45.mp3",
    duration: "00:16:49",
    length: 11985380,
  },
];

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function onRequestGet(context) {
  const pubDate = "Mon, 07 Apr 2025 00:00:00 GMT";

  const items = EPISODES.map((ep) => {
    const url = `${AUDIO_BASE}/${ep.filename}`;
    return `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <description>${escapeXml(ep.description)}</description>
      <enclosure url="${url}" length="${ep.length}" type="audio/mpeg"/>
      <guid isPermaLink="false">ai-safety-atlas-ch4-${ep.index}</guid>
      <pubDate>${pubDate}</pubDate>
      <itunes:duration>${ep.duration}</itunes:duration>
      <itunes:episode>${ep.index.split(".")[1]}</itunes:episode>
      <itunes:season>4</itunes:season>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>AI Safety Atlas — Chapter 4: Governance</title>
    <description>Per-section audio from the AI Safety Atlas, Chapter 4: AI Governance. Generated from the atlas text using TTS.</description>
    <link>https://ai-safety-atlas.com/chapters/v1/governance/introduction</link>
    <language>en-us</language>
    <itunes:author>AI Safety Atlas</itunes:author>
    <itunes:category text="Education">
      <itunes:category text="Higher Education"/>
    </itunes:category>
    <itunes:explicit>no</itunes:explicit>
    <itunes:type>serial</itunes:type>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
