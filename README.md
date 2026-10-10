<div align="center">

# Gurwinder Parhar | Portfolio

**Front-end developer from Punjab, India, who turns designs into fast, responsive, animated interfaces.**

[![Live Site](https://img.shields.io/badge/Live-Portfolio-7C5CFF?style=for-the-badge&logo=githubpages&logoColor=white)](https://surjaa.github.io/Gurwinder-portfolio.github.io/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#tech-stack)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](#tech-stack)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#tech-stack)

[View Live Site](https://surjaa.github.io/Gurwinder-portfolio.github.io/) · [LinkedIn](https://www.linkedin.com/in/gurwinder-parhar/) · [GitHub](https://github.com/surjaa)

</div>

---

## Table of Contents

- [About](#about)
- [Highlights](#highlights)
- [Sections](#sections)
- [Featured Projects](#featured-projects)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Customization](#customization)
- [Contact Form Setup](#contact-form-setup)
- [Deployment](#deployment)
- [Accessibility and Performance](#accessibility-and-performance)
- [Browser Support](#browser-support)
- [Contact](#contact)

---

## About

This is my personal portfolio website. It is built **without any frameworks**, using only plain HTML, CSS and JavaScript, to show what the web platform can do on its own: animation, interaction, theming and a layout that adapts to every screen.

Instead of just listing projects, the site lets visitors **open each project, resize it in a device frame, play with live CSS tools, try UI components and even play a game**.

## Highlights

- **Animated loader** with a progress counter and a slide-away reveal
- **Interactive particle hero** drawn on a canvas, with a rotating role line
- **Scroll progress bar**, scroll reveals and animated counters
- **Custom cursor** on devices with a mouse (hidden on touch screens)
- **Light and dark theme** that follows the system setting and remembers your choice
- **Accent colour switcher** to change the look of the whole site
- **Focus mode** that softens the sections you are not reading
- **Project pages** with a resizable device frame to test responsiveness live
- **Live CSS Lab** with Flexbox, card styler and easing tools that generate code as you change the controls
- **UI component shelf** with working, accessible widgets
- **Playable Snake game** where you collect skill tiles to unlock a message
- **Working contact form** powered by EmailJS (no back end needed)
- **Keyboard friendly**, with a skip link and reduced-motion support

## Sections

| Section | What it shows |
| --- | --- |
| **Home** | Particle hero, role line, quick stats and skill marquee |
| **About** | Background, education, award, and "how I build / how I ship" tabs |
| **Services** | Front-end development, responsive design, animation and interaction, documentation and content |
| **Skills** | Filterable toolbox with proficiency dots |
| **Process** | The five steps followed on every project, advancing automatically |
| **Projects** | Nine projects, each with a summary, features, stack and run instructions |
| **Lab** | Flexbox playground, glass-card styler and easing visualizer with live code output |
| **UI Kit** | Toggle switch, accordion, star rating, like button, toasts, skeleton loader, password strength meter, before/after slider and native dialog |
| **Playground** | A Snake game played with arrow keys, WASD or swipes |
| **Journey** | Education, internship and work timeline, certifications and award |
| **Writing** | Technical writing and documentation experience |
| **Contact** | Email form, copy-to-clipboard email and social links |

## Featured Projects

The portfolio presents nine projects in two groups.

### Business apps and dashboards

| Project | Description | Stack |
| --- | --- | --- |
| **Operations Command Center** | Ten-screen operations dashboard (sales, inventory, procurement, vendors, people) with URL-based filters, data tables and CSV/Excel export | React, React Router, Recharts, Vite, Flask, SQLite |
| **OpsPulse** | Twelve-screen BI dashboard with roles (admin, manager, viewer), a Ctrl+K command bar, toasts, drawers and a mock API | React, React Router, Recharts, Vite, SheetJS |
| **BI Analytics Portal** | Power BI style portal with its own hand-written SVG chart library, drill-downs and 219,200 rows of data; opens with a double-click | HTML, CSS, JavaScript |
| **Larder Store** | Complete online store with filters, compare, cart, four-step checkout, order tracking and an admin page | HTML, CSS, JavaScript, Node.js |

### Websites and smaller apps

| Project | Description | Links |
| --- | --- | --- |
| **Music Streaming App** | Upload or link your own audio and video, build playlists, play online or offline | [Live](https://surjaa.github.io/Music-app/) |
| **Coffee Brand Website** | Responsive brand site with scroll animations and interactive product sections | [Live](https://surjaa.github.io/Coffee-website.github.io/) |
| **Community Blogging Platform** | Sign in, write posts and upload visual content (in progress) | [Live](https://surjaa.github.io/Blogging-platform.github.io/) |
| **Security Score Web App** | Password and email security checks with an interactive dashboard and recommendations | [GitHub](https://github.com/surjaa) |
| **This Portfolio** | The site you are looking at, built with plain HTML, CSS and JavaScript | [Code](https://github.com/surjaa/Gurwinder-portfolio.github.io) |

## Tech Stack

| Area | Tools |
| --- | --- |
| **Languages** | HTML5, CSS3, JavaScript (ES6+) |
| **Styling** | Flexbox, CSS Grid, CSS variables, media queries, keyframe animations |
| **Browser APIs** | Canvas, IntersectionObserver, requestAnimationFrame, localStorage, native `<dialog>` |
| **Fonts** | Poppins, JetBrains Mono, Mrs Saint Delafield (Google Fonts) |
| **Email** | EmailJS (browser SDK via CDN) |
| **Hosting** | GitHub Pages |

No build step, no bundler and no package installs are needed.

## Project Structure

```text
Gurwinder-portfolio.github.io/
├── index.html          # The whole portfolio (HTML, CSS and JS in one file)
├── Images/             # Project screenshots used in the Projects section
│   ├── Music-app.png
│   ├── Coffee-website.png
│   ├── Blogging-platform.png
│   ├── Security-score.png
│   ├── ops-command-center.png
│   └── opspulse.png
├── projects/           # Self-contained demos opened inside the project frames
│   ├── bi-analytics-portal/
│   │   └── index.html
│   └── larder-store/
│       └── index.html
└── README.md
```

> If a screenshot is missing, the site automatically shows a drawn preview instead, so nothing breaks.

## Getting Started

### Run locally

1. **Clone the repository**

   ```bash
   git clone https://github.com/surjaa/Gurwinder-portfolio.github.io.git
   cd Gurwinder-portfolio.github.io
   ```

2. **Open the site**

   Simply open `index.html` in your browser.

   Or, for a local server (recommended so that embedded demos load properly):

   ```bash
   # Python
   python -m http.server 5500

   # or Node.js
   npx serve .
   ```

   Then visit `http://localhost:5500`.

## Customization

Most content lives in clearly labelled blocks inside `index.html`.

| What to change | Where to look |
| --- | --- |
| **Colours** | The `:root` block at the top of the `<style>` tag (`--ink`, `--paper`, `--sun`, `--coral`, `--teal`, `--violet`) |
| **Fonts** | The Google Fonts `<link>` in `<head>` and the `--head`, `--body`, `--mono` variables |
| **Page title and meta description** | The `<title>` and `<meta>` tags in `<head>` |
| **Projects** | The `PROJECTS` array in the script. Each project has `id`, `title`, `kind`, `status`, `img`, `live`, `links`, `summary`, `features`, `stack` and `run` |
| **Timeline and certifications** | The `#journey` section |
| **Social links** | The `#contact` section and the footer |

### Adding a new project

Add a new object to the `PROJECTS` array:

```js
{
  id: 'my-project',
  group: 'web',                       // 'apps' or 'web'
  title: 'My New Project',
  kind: 'Website',
  status: 'Live',
  tone: 'teal',                       // violet, teal, sun or coral
  img: 'Images/my-project.png',       // screenshot (optional)
  live: 'https://example.com/',       // live demo (optional)
  links: [['View the code', 'https://github.com/surjaa/my-project']],
  summary: 'One or two sentences about the project.',
  features: ['First feature', 'Second feature'],
  stack: ['HTML5', 'CSS3', 'JavaScript']
}
```

## Contact Form Setup

The contact form uses [EmailJS](https://www.emailjs.com/), so it works on a static site with no server.

1. Create a free EmailJS account and add an email service.
2. Create an email template with the variables used by the form.
3. In `index.html`, find the `EMAILJS` object and fill in your own details:

   ```js
   var EMAILJS = {
     publicKey: 'YOUR_PUBLIC_KEY',
     service:   'YOUR_SERVICE_ID',
     template:  'YOUR_TEMPLATE_ID'
   };
   ```

> The EmailJS public key is designed to be used in the browser. To limit abuse, restrict it to your own domain in the EmailJS dashboard (Account → Security).

## Deployment

The site is hosted on **GitHub Pages**.

1. Push the project to a repository named `<username>.github.io` (or any repository).
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and the `/ (root)` folder, then save.
4. Your site goes live at `https://<username>.github.io/` (or `https://<username>.github.io/<repo>/`) within a minute or two.

## Accessibility and Performance

- Semantic HTML first, styling second, scripting last
- Skip-to-content link and visible focus outlines
- Full keyboard support for widgets (switch, accordion, rating, dialog, game)
- `prefers-reduced-motion` support, so animation is turned down for those who want it
- `prefers-color-scheme` support, with a saved manual theme override
- Mobile-first, responsive layout with Flexbox and CSS Grid
- Motion limited to `transform` and `opacity` where possible
- No heavy libraries: the only external script is the EmailJS SDK

## Browser Support

Works in the latest versions of Chrome, Edge, Firefox and Safari, on desktop and mobile.

## Contact

I am open to front-end developer roles. Feel free to reach out.

- **Email:** gurwinderanusurja@gmail.com
- **LinkedIn:** [gurwinder-parhar](https://www.linkedin.com/in/gurwinder-parhar/)
- **GitHub:** [surjaa](https://github.com/surjaa)

---

<div align="center">

Designed and built by **Gurwinder Parhar** · Punjab, India

If you like this portfolio, consider giving the repo a star.

</div>
