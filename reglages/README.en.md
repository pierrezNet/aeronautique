# MSFS Settings Workshop

*[Version française](README.md)*

A learning tool for Microsoft Flight Simulator 2020 and 2024: understand what limits your frames per second, pick a target that suits your monitor or virtual reality headset, then test one setting at a time. Online at [aeronautique.xyz/en/reglages/](https://aeronautique.xyz/en/reglages/).

Independent tool, not affiliated with Microsoft or Asobo Studio.

## What the tool does

1. **Bottleneck diagnosis**: processor (and which thread), graphics card, video memory or data loading, from the developer mode FPS display, a [PresentMon](https://github.com/GameTechDev/PresentMon) capture or, failing that, the symptoms you describe.
2. **Frame rate target**: values that divide your display refresh rate exactly (165 Hz → 82.5; 55; 41.25…), variable refresh (VRR), whether your frame limit "fits". In **virtual reality** (in beta, feedback welcome on the [Workshop forum](https://avrobb.org/en/forum/13-msfs-settings-workshop)): the headset refresh rate or half of it with reprojection (ASW, Motion Smoothing, SSW), the headset runtime, VR-specific settings (foveated rendering, frame generation in VR) and reading the VR settings from `UserCfg.opt`.
3. **Frame Generation**: availability for your card (RTX 40 / 50), and a reminder that it multiplies displayed frames, not the simulation.
4. **Settings table** sorted by bottleneck: impact on processor, graphics card and video memory, visual cost, starting point, how to check; with your current values if you import your `UserCfg.opt`.
5. **Challenge mode**: questions about the settings you changed, in light of your diagnosis.
6. **Before/after journal** with a reproducible test protocol, exportable as JSON and CSV.
7. **Optional AI**: a text summarising your situation, to copy into the AI of your choice, or to send to Claude, ChatGPT or Gemini with **your own key**.

## Privacy

Everything runs in the browser. Answers, journal and imported files stay on the device (browser local storage); nothing is sent to aeronautique.xyz. The only possible transfer is the one you trigger to the AI provider of your choice, with your key, and the exact text is shown beforehand. The site's audience measurement (Cloudflare Web Analytics) sets no cookie.

## An open, sourced knowledge base

Settings, rules and questions live in [`donnees/`](donnees/), separate from the code. Each entry states the simulator, the Sim Update tested, its sources and a status: **verified** (at least one official, manufacturer or published-measurement source) or **to be checked**, shown as such in the tool. Nothing is stated without a source.

Texts are written in French and English; field names and code comments are in French (the project's working language).

## Development

Node.js 20 or later, for tests only. No dependencies, no build step.

```bash
cd reglages
npm test                                  # all tests
npm run verifier                          # entries to be checked or outdated
npm run verifier -- --avant 2024:SU7      # entries tested before a Sim Update
npm run essai                             # the engine on the sample case, from the command line
```

To view the page, serve **the repository root** (the page uses absolute paths): `npx serve .` then open `http://localhost:3000/en/reglages/`.

To contribute (add a setting, a rule or hardware, report an outdated rule): see [CONTRIBUTING.md](CONTRIBUTING.md) (in French).

## Licences

Code under the [MIT](../LICENSE) licence; knowledge base texts under [CC BY 4.0](../LICENSE-CC-BY-4.0). The PresentMon captures in `tests/captures/` (Intel) and the files in `tests/usercfg/` keep their original MIT licence (see the `LISEZMOI.txt` files).
