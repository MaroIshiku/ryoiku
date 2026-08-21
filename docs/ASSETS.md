# Asset provenance

| Asset | Origin | SHA-256 | Use |
| --- | --- | --- | --- |
| `assets/icon-source.png` | Supplied and approved by the repository owner | `fad755ba6385aafe520ad6a2604269b8367b78639daaaabe8dad8734c103afad` | Canonical 1254×1254 RGBA application icon source |
| `src/client/public/ryoiku-icon.png` | Direct Lanczos downscale of the approved source | `82c63d72a3073e6d4211d0c6869dbdede9b95eb2d63ab291ca9a8f6c209d565d` | Backward-compatible 512×512 application and catalog icon |
| `src/client/public/icons/icon-{32,64,128,180,192,256,512,1024}.png` | Deterministic direct downscales of the approved source | See `assets/icon-notes.yaml` | Browser, launcher, and high-resolution web icon exports |
| `src/client/public/icons/favicon-32.png` | Exact copy of `icon-32.png` | `b33bb60c9443d651991b954c5de0b2cfc1ef39d2668d66d3d68b9405c458b6f6` | Browser favicon |
| `src/client/public/icons/apple-touch-icon.png` | Exact copy of `icon-180.png` | `0b250f14ea1c6eefd0e179a2e624c278ffb7801dd6771d493477504360d81908` | Apple touch icon |

The application does not fetch remote fonts, map tiles, or imagery at runtime. The ZimaOS catalog metadata references the repository-hosted application icon only; it is not loaded by the application runtime. World geometry is provided by the pinned `world-atlas` dependency and attributed in `THIRD_PARTY_LICENSES.md`.
