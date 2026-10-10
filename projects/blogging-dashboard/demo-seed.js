/* Demo content for preview.html only. Not used by the real app. */
window.BP_DEMO_SEED = function (now) {
  const DAY = 86400000;
  const at = (daysAgo, hour) => {
    if (daysAgo === 0) return now - 5 * 60000;
    const d = new Date(now - daysAgo * DAY);
    d.setHours(hour || 10, (daysAgo * 7) % 60, 0, 0);
    return d.getTime();
  };
  const ME = "demo@blog.com";
  const maya = { author: "Maya Singh", authorId: "maya@blog.com" };
  const arjun = { author: "Arjun Mehta", authorId: "arjun@blog.com" };
  const me = { author: "Demo Writer", authorId: ME };
  const cm = (who, text, daysAgo, n) => ({ id: `c${daysAgo}-${n}`, ...who, text, at: at(daysAgo, 15) });

  const posts = [
    {
      id: at(0), ownerId: ME, author: "Demo Writer", status: "published", createdAt: at(0), updatedAt: at(0),
      title: "What a 16-week writing streak taught me",
      description: "Small daily posts beat big occasional ones. Here is what changed once I stopped waiting for inspiration.",
      tags: ["writing", "habits"], likes: ["maya@blog.com", "arjun@blog.com"],
      comments: [cm(maya, "The part about lowering the bar is exactly right.", 0, 1)],
      content: "I used to wait for a big idea before sitting down to write. Most weeks, that meant I never sat down.\n\n## The rule\n\nOne post a day, even if it is only a few lines. A rough post that exists is worth more than a perfect one that does not.\n\n> Consistency is just showing up when you do not feel like it.\n\n## What changed\n\n- I stopped editing while drafting\n- I kept a list of half-ideas in my notes\n- I published first and polished later\n\nThe streak is not the point. The habit is.",
    },
    {
      id: at(1, 9), ownerId: ME, author: "Demo Writer", status: "published", createdAt: at(1, 9), updatedAt: at(1, 9),
      title: "CSS grid patterns I reach for every week",
      description: "Four layouts that cover most of what a blog or dashboard needs.",
      tags: ["css", "frontend"], likes: ["maya@blog.com"],
      comments: [cm(arjun, "The auto-fill trick saved me a media query today.", 1, 1), cm(maya, "Could you add the sidebar layout too?", 1, 2)],
      content: "Grid replaced most of my layout hacks. These are the patterns I keep reusing.\n\n## Auto-fill cards\n\nUse `repeat(auto-fill, minmax(280px, 1fr))` and the cards reflow on their own, no media queries needed.\n\n## Sidebar and content\n\nA fixed sidebar column and a `minmax(0, 1fr)` main column. The `minmax(0, ...)` part stops long content from blowing out the layout.\n\n## Holy grail, simplified\n\nHeader, main, footer with `grid-template-rows: auto 1fr auto` on the body.",
    },
    {
      id: at(2, 18), ownerId: ME, author: "Demo Writer", status: "published", createdAt: at(2, 18), updatedAt: at(2, 18),
      title: "Weekend notes from a Punjab road trip",
      description: "Dhabas, canals and a very long drive home.",
      tags: ["travel", "punjab"], likes: ["arjun@blog.com", "maya@blog.com", "sam@blog.com"],
      comments: [cm(maya, "Now I want parathas.", 2, 1)],
      content: "We left Jalandhar before sunrise and the mustard fields were still glowing in the early light.\n\n## Stops worth making\n\n- A roadside dhaba near Banga with the best lassi\n- The canal bridge at golden hour\n- A tiny bookshop that sold chai along with poetry\n\nThe drive home took twice as long. Nobody minded.",
    },
    {
      id: at(4, 11), ownerId: ME, author: "Demo Writer", status: "published", createdAt: at(4, 11), updatedAt: at(4, 11),
      title: "Writing SEO articles people actually finish",
      description: "Search intent, honest headlines and why the first paragraph decides everything.",
      tags: ["seo", "writing"], likes: ["maya@blog.com"],
      comments: [],
      content: "Ranking gets someone to the page. Writing keeps them there.\n\n## Start from the question\n\nBefore drafting, write the exact question the reader typed. Answer it in the first two sentences, then earn the rest of the scroll.\n\n## Headlines that do not lie\n\nIf the headline promises a checklist, deliver a checklist. Trust is the best ranking signal you can build yourself.",
    },
    {
      id: at(9, 10), ownerId: ME, author: "Demo Writer", status: "published", createdAt: at(9, 10), updatedAt: at(8, 10),
      title: "Why I rebuilt my portfolio three times",
      description: "A short story about scope, polish and shipping.",
      tags: ["frontend", "career"], likes: ["arjun@blog.com"],
      comments: [cm(arjun, "Version two is always the one that teaches you the most.", 8, 1)],
      content: "The first version was a template. The second was a mess of animations. The third finally had a point of view.\n\nEach rebuild taught me something the previous one hid: layout first, motion last, content always.",
    },
    {
      id: at(16, 14), ownerId: ME, author: "Demo Writer", status: "published", createdAt: at(16, 14), updatedAt: at(16, 14),
      title: "A beginner-friendly tour of localStorage",
      description: "What it stores, what it cannot, and when to graduate to a real database.",
      tags: ["javascript", "frontend"], likes: ["maya@blog.com", "sam@blog.com"],
      comments: [],
      content: "localStorage keeps small strings in the browser, forever, per site.\n\n## Good for\n\n- Theme choice\n- Draft autosave\n- Tiny demos\n\n## Not good for\n\n- Anything private\n- Anything that must sync across devices\n\nWhen you need those, reach for a backend.",
    },
    {
      id: at(23, 9), ownerId: ME, author: "Demo Writer", status: "published", createdAt: at(23, 9), updatedAt: at(23, 9),
      title: "Ten minutes of research beats an hour of guessing",
      description: "How I vet a technical topic before writing about it.",
      tags: ["writing", "research"], likes: [],
      comments: [],
      content: "Before I write about a tool, I read the changelog, skim the open issues and run the example myself. Ten minutes, every time.\n\nThe article gets shorter, more accurate and a lot more useful.",
    },
    {
      id: at(31, 16), ownerId: ME, author: "Demo Writer", status: "published", createdAt: at(31, 16), updatedAt: at(31, 16),
      title: "Dark mode without the flash",
      description: "A three-line script that applies your theme before the first paint.",
      tags: ["css", "javascript"], likes: ["arjun@blog.com"],
      comments: [cm(arjun, "The inline head script is the key. Thanks!", 30, 1)],
      content: "The flash of the wrong theme happens because the page paints before your JavaScript runs.\n\nPut a tiny inline script in the head that reads the saved theme and sets a data attribute. The first paint is then already correct.",
    },
    {
      id: at(44, 12), ownerId: ME, author: "Demo Writer", status: "published", createdAt: at(44, 12), updatedAt: at(44, 12),
      title: "Release notes people read",
      description: "Writing changelogs for humans.",
      tags: ["writing", "docs"], likes: [],
      comments: [],
      content: "Lead with what changed for the reader, not what changed in the code. Group by outcome. Link to the details for people who want them.",
    },
    {
      id: at(2, 22), ownerId: ME, author: "Demo Writer", status: "draft", createdAt: at(2, 22), updatedAt: at(2, 22),
      title: "Ideas for the next series",
      description: "",
      tags: ["notes"], likes: [], comments: [],
      content: "- A beginner guide to Git branching\n- Accessibility checks in ten minutes\n- Notes on writing for developers",
    },

    // Community posts by other writers
    {
      id: at(1, 8), ownerId: "maya@blog.com", author: "Maya Singh", status: "published", createdAt: at(1, 8), updatedAt: at(1, 8),
      title: "Sketching before you code",
      description: "Ten minutes with paper saves hours in the editor.",
      tags: ["design", "frontend"], likes: [ME, "arjun@blog.com"],
      comments: [cm(me, "Stealing the paper-first idea for my next project.", 1, 9)],
      content: "Before opening the editor, I draw the screen on paper. Boxes, arrows, rough labels.\n\nIt forces decisions early, when they are cheap. The code that follows is simpler because the layout is already settled.",
    },
    {
      id: at(3, 13), ownerId: "arjun@blog.com", author: "Arjun Mehta", status: "published", createdAt: at(3, 13), updatedAt: at(3, 13),
      title: "Understanding async/await in plain English",
      description: "Promises without the jargon.",
      tags: ["javascript", "beginners"], likes: ["maya@blog.com"],
      comments: [],
      content: "An async function is just a function that can wait.\n\n`await` pauses that function until the promise settles, and the rest of your page keeps running.\n\n## One mistake to avoid\n\nAwaiting things one by one when they could run together. Use `Promise.all` for independent work.",
    },
    {
      id: at(6, 17), ownerId: "maya@blog.com", author: "Maya Singh", status: "published", createdAt: at(6, 17), updatedAt: at(6, 17),
      title: "A small guide to readable forms",
      description: "Labels, errors and spacing that make forms feel easy.",
      tags: ["design", "accessibility"], likes: [ME],
      comments: [],
      content: "Put the label above the field. Say what went wrong and how to fix it. Keep the primary action named after what it does.\n\nA form is a conversation. Make it a polite one.",
    },
    {
      id: at(12, 10), ownerId: "arjun@blog.com", author: "Arjun Mehta", status: "published", createdAt: at(12, 10), updatedAt: at(12, 10),
      title: "How I learned to read other people's code",
      description: "Start from the entry point and follow one request all the way through.",
      tags: ["career", "beginners"], likes: [],
      comments: [],
      content: "Pick one user action. Find where it starts. Follow it through every function until it ends.\n\nThen draw what you found. The map you make is worth more than any README.",
    },
  ];

  return { user: { name: "Demo Writer", email: ME, password: "demo12345" }, posts };
};
