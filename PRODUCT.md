# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS and JavaScript, no build step, served by GitHub Pages from `main`
(https://mpljuegosdigitales.com, custom domain set by the `CNAME` file). The catalogue arrives as `catalog.json`, published daily at
9:00 (Argentina) by the private repo mpl-precios; covers in `img/j/`. Search is `js/buscar.js` with
`sinonimos.json` and `sagas.json` (newest-first order of the most searched series), no external libraries; anything third-party must be vendored into the repo.

## Users

People in Argentina buying digital PS4 and PS5 games, almost always from a phone (360-430px wide),
often on mobile data. They arrive looking for a specific game, or browsing what is cheap, and want to
know the price in cash/transfer and in 3 card instalments before writing on WhatsApp.

## Product Purpose

MPL Juegos Digitales is the shop of two partners, Mateo and Luca. The site is the catalogue: find the
game, see both prices, and open a WhatsApp chat with one of the partners with the order already
written (game, console, price and instalment). Success is a visitor reaching the right game and sending
that message.

## Positioning

A small shop run by two people the buyer talks to directly on WhatsApp, with the whole PS4/PS5
catalogue (~2,100 games) priced daily and an instalment price shown up front.

## Operating Context

- Purchase happens on WhatsApp, not on the site: no cart, no checkout, no payment form.
- Payment method for 3 instalments and delivery time are agreed on WhatsApp; the site does not state them.
- Two contacts: Mateo (+54 9 3482 66-4743, wa.me/5493482664743) and Luca (+54 9 3482 20-9654,
  wa.me/5493482209654). The visitor chooses one from a small menu.
- What is sold is the primary-slot ("Primario") version of each game; the site explains in one short
  line what the buyer gets.
- Prices change daily; `catalog.json` carries `actualizado` (ISO date-time).

## Capabilities and Constraints

- Each game: name (cleaned), console (PS4, PS5, rarely "PS4 / PS5"), tags ("Versión PS4" for a PS4
  version that runs on PS5, "Preventa dd/mm[/aaaa]", "Solo DLC"), cover image (480px webp, may be
  missing), contado, and cuota/tarjeta only when catalog.json has "mostrar_cuotas": true.
- Offers ("ofertas" in catalog.json): the page picks, at that moment, the cheapest offer still valid ("hasta"
  already has the safety margin, Argentina time). The card shows a tag with the promotion and the discount
  ("Black Friday −27%") under the cover, the old price struck through, the new price and "Válido hasta el
  19/11"; the WhatsApp message says it is an offer price and until when. A filter button named after the
  promotion (first in the filter row, which scrolls sideways if it does not fit) shows only offers; with no
  valid offer it is hidden. Games flagged "solo_oferta" only exist while their offer is valid.
- Instalments are switched off for now ("mostrar_cuotas": false in mpl-precios/config.json): the price
  reads "Efectivo o transferencia $X" and nothing names cuotas or tarjeta. With true it goes back to
  "Contado / transferencia $X" + "3 cuotas sin interés de $Y", and the WhatsApp message adds the
  instalment value.
- Search tolerant of typos and synonyms; filter PS4 / PS5; sort by price. While a query is typed the
  order is by relevance; choosing a price order re-sorts by price. With no match: "No encontramos ese
  juego" and a WhatsApp button to ask.
- About 2,075 games: covers lazy-loaded, space reserved, "Cargar más" instead of rendering everything.
- Never show cost, provider IDs, provider links or the provider's name.

## Brand Commitments

- Name: MPL Juegos Digitales.
- Logo: `LOGO_MPL_sin_fondo.png` (763×404, transparent). Never modified, cropped or recoloured. On the
  phone it fits the header without taking half the screen.
- Palette (binding, from the owners): #E5AFFB light lilac, #975AB7 violet, #4F1964 dark violet. No other
  hues; neutrals only where text needs contrast.
- No decorations or motifs that were not asked for.
- Voice: Argentine Spanish (vos), plain and direct.

## Evidence on Hand

- Real catalogue and prices (`catalog.json`), real covers (`img/j/`), the logo.
- Instagram: @mpljuegosdigitales (https://www.instagram.com/mpljuegosdigitales/), linked in the footer.
- No testimonials, sales figures, reviews or press: none may be invented.

## Product Principles

1. The phone comes first: every decision is made at 360-430px, then adapted up.
2. Price clarity over persuasion: both prices legible at a glance, instalment value stated, nothing hidden.
3. Finding the game is the job: search and filters always within reach.
4. The conversation is the checkout: one tap from any game to a written WhatsApp message.
5. Truth only: no invented proof, no provider information.

## Accessibility & Inclusion

Touch targets at least 44px tall. Readable on mobile data and small screens; text contrast WCAG AA.
