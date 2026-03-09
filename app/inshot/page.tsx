'use client'

export default function InshotPage() {
  return (
    <div className="min-h-screen bg-[#111318]">
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .inshot-page {
          font-family: 'DM Mono', monospace;
          color: #dde1f0;
          padding: 40px 28px 80px;
          min-width: 700px;
        }

        .inshot-page h1 {
          font-family: 'Syne', sans-serif;
          font-size: 1.9rem;
          font-weight: 800;
          color: #fff;
          text-align: center;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
        }
        .inshot-page h1 em { font-style: normal; color: #ff4f4f; }
        .inshot-page .subtitle {
          text-align: center;
          font-size: 0.68rem;
          color: #555;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-bottom: 50px;
        }

        .inshot-page .tree { max-width: 1150px; margin: 0 auto; }
        .inshot-page .level { display: flex; flex-direction: column; }
        .inshot-page .row { display: flex; align-items: flex-start; margin-top: 6px; }

        .inshot-page .connector-v {
          width: 2px;
          background: #2a2e40;
          align-self: stretch;
          flex-shrink: 0;
          border-radius: 2px;
        }
        .inshot-page .connector-h {
          height: 2px;
          width: 22px;
          flex-shrink: 0;
          margin-top: 16px;
          border-radius: 2px;
        }

        .inshot-page .n0 {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 13px 26px; border-radius: 12px;
          background: #ff4f4f; color: #000;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.05rem;
          letter-spacing: 0.04em; box-shadow: 0 0 30px #ff4f4f44;
          cursor: pointer; user-select: none; white-space: nowrap;
        }
        .inshot-page .n1 {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 9px;
          font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.88rem;
          letter-spacing: 0.05em; cursor: pointer; user-select: none;
          white-space: nowrap; border: 2px solid;
        }
        .inshot-page .n2 {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 7px 15px; border-radius: 7px;
          font-weight: 600; font-size: 0.78rem; letter-spacing: 0.04em;
          cursor: pointer; user-select: none; white-space: nowrap; border: 1.5px solid;
        }
        .inshot-page .n3 {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 13px; border-radius: 6px;
          font-size: 0.74rem; letter-spacing: 0.03em;
          background: #191d2a; border: 1px solid #252b3e; color: #a0a8c8;
          cursor: pointer; user-select: none; white-space: nowrap;
        }
        .inshot-page .n3.hasch { font-weight: 600; }
        .inshot-page .n4 {
          display: inline-flex; align-items: center;
          padding: 3px 11px; border-radius: 4px;
          font-size: 0.66rem; color: #6a7090;
          background: #141720; border: 1px solid #1e2235; white-space: nowrap;
        }

        .inshot-page .caret { font-size: 0.6rem; opacity: 0.65; display: inline-block; transition: transform 0.2s; }
        .inshot-page .collapsed > .children-wrap { display: none; }

        .inshot-page .legend {
          max-width: 1150px; margin: 42px auto 0;
          display: flex; gap: 20px; flex-wrap: wrap;
          border-top: 1px solid #1e2235; padding-top: 20px;
        }
        .inshot-page .legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.68rem; color: #555; letter-spacing: 0.04em; }
        .inshot-page .legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;600&family=Syne:wght@700;800&display=swap" rel="stylesheet" />

      <div className="inshot-page">
        <h1><em>InShot</em> — Complete Options Hierarchy</h1>
        <p className="subtitle">Click any node to expand / collapse · Colours indicate branches</p>
        <div className="tree" id="tree"></div>

        <div className="legend">
          <div className="legend-item"><div className="legend-dot" style={{background:'#555'}}></div>Video / Photo (separate modes)</div>
          <div className="legend-item"><div className="legend-dot" style={{background:'#ff9f1c'}}></div>Collage → Grid</div>
          <div className="legend-item"><div className="legend-dot" style={{background:'#06d6a0'}}></div>Collage → Blend</div>
          <div className="legend-item"><div className="legend-dot" style={{background:'#3a86ff'}}></div>Collage → Stitch</div>
          <div className="legend-item"><div className="legend-dot" style={{background:'#c77dff'}}></div>Shared tools (editing, overlays, export)</div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        const TREE = {
          label:"INSHOT APP", depth:0, color:"#ff4f4f",
          children:[
            { label:"VIDEO", depth:1, color:"#555", borderColor:"#333", note:"(separate mode — not covered)", children:[] },
            { label:"PHOTO", depth:1, color:"#555", borderColor:"#333", note:"(separate mode — not covered)", children:[] },
            {
              label:"COLLAGE", depth:1, color:"#ff9f1c", borderColor:"#ff9f1c",
              children:[

                /* STEP 1 — SELECT */
                { label:"① SELECT PHOTOS (first step)", depth:2, color:"#888", borderColor:"#444",
                  children:[
                    { label:"Tap photos from Camera Roll / Gallery", depth:3 },
                    { label:"Up to 20 photos (Grid mode), fewer for Blend/Stitch", depth:3 },
                    { label:"Order selected = order placed in layout", depth:3 },
                    { label:"Can add more photos after picking layout", depth:3 },
                  ]
                },

                /* STEP 2 — COLLAGE TYPE */
                { label:"② CHOOSE COLLAGE TYPE", depth:2, color:"#ff9f1c", borderColor:"#ff9f1c",
                  children:[

                    /* GRID */
                    { label:"GRID", depth:2, color:"#ff9f1c", borderColor:"#ff9f1c",
                      desc:"Fixed cells — photos sit in separate tile slots",
                      children:[
                        { label:"Layout Templates (100+)", depth:3,
                          children:[
                            { label:"1 photo — full frame", depth:4 },
                            { label:"2 photos — vertical split (side by side)", depth:4 },
                            { label:"2 photos — horizontal split (top / bottom)", depth:4 },
                            { label:"3 photos — row, column, L-shape, T-shape", depth:4 },
                            { label:"4 photos — 2×2, strips, unequal tile sizes", depth:4 },
                            { label:"5–9 photos — mosaic, magazine, asymmetric", depth:4 },
                            { label:"10–20 photos — dense grid templates", depth:4 },
                            { label:'"InShot" style — B&W artistic bg, drag colour photos on top', depth:4 },
                          ]
                        },
                        { label:"Aspect Ratio", depth:3,
                          children:[
                            { label:"1:1  Square — Instagram post", depth:4 },
                            { label:"9:16  Portrait — TikTok / Reels / Stories", depth:4 },
                            { label:"16:9  Landscape — YouTube", depth:4 },
                            { label:"4:5  Instagram Feed portrait", depth:4 },
                            { label:"3:4  Standard portrait", depth:4 },
                            { label:"2:1  Wide / banner", depth:4 },
                            { label:"Custom / free ratio", depth:4 },
                          ]
                        },
                        { label:"Border & Spacing", depth:3,
                          children:[
                            { label:"Gap between tiles — slider 0 to max", depth:4 },
                            { label:"Outer padding / margin", depth:4 },
                            { label:"Corner rounding radius", depth:4 },
                            { label:"Border colour picker", depth:4 },
                            { label:"Border thickness", depth:4 },
                          ]
                        },
                        { label:"Background", depth:3,
                          children:[
                            { label:"Solid colour", depth:4 },
                            { label:"Gradient presets", depth:4 },
                            { label:"Blurred photo background", depth:4 },
                            { label:"Custom uploaded image", depth:4 },
                            { label:"Pattern / texture library", depth:4 },
                          ]
                        },
                      ]
                    },

                    /* BLEND */
                    { label:"BLEND", depth:2, color:"#06d6a0", borderColor:"#06d6a0",
                      desc:"AI merges photos with soft seamless edges — no hard cell borders",
                      children:[
                        { label:"Layout templates", depth:3,
                          children:[
                            { label:"2-photo blend — side by side with soft merge", depth:4 },
                            { label:"3-photo blend — row or stacked arrangement", depth:4 },
                            { label:"Overlap / floating freeform arrangement", depth:4 },
                          ]
                        },
                        { label:"Blend Modes (AI edge effect per photo)", depth:3,
                          children:[
                            { label:"Normal", depth:4 },
                            { label:"Dissolve / Fade edge", depth:4 },
                            { label:"Luminosity", depth:4 },
                            { label:"Screen", depth:4 },
                            { label:"Multiply", depth:4 },
                            { label:"Overlay", depth:4 },
                          ]
                        },
                        { label:"Scale each photo within the blend", depth:3 },
                        { label:"Aspect Ratio (same options as Grid)", depth:3 },
                        { label:"Background (colour / gradient / custom photo)", depth:3 },
                      ]
                    },

                    /* STITCH */
                    { label:"STITCH", depth:2, color:"#3a86ff", borderColor:"#3a86ff",
                      desc:"Joins images end-to-end — great for screenshots or sequential photos",
                      children:[
                        { label:"Stitch Direction", depth:3,
                          children:[
                            { label:"Vertical — images stacked top to bottom (most common)", depth:4 },
                            { label:"Horizontal — images laid side by side", depth:4 },
                          ]
                        },
                        { label:"AI Caption / Text Recognition", depth:3,
                          children:[
                            { label:"Auto-detects repeated headers in screenshots", depth:4 },
                            { label:"Removes duplicate caption / status bars", depth:4 },
                            { label:"Seamless join even with device UI chrome", depth:4 },
                          ]
                        },
                        { label:"Background & Borders (recently added feature)", depth:3,
                          children:[
                            { label:"Add background colour or image behind the strip", depth:4 },
                            { label:"Add decorative border around the full stitch", depth:4 },
                            { label:"Control gap between joined images", depth:4 },
                          ]
                        },
                        { label:"Aspect Ratio", depth:3,
                          children:[
                            { label:"Auto — matches stitched content height", depth:4 },
                            { label:"9:16  Stories", depth:4 },
                            { label:"1:1  Square", depth:4 },
                          ]
                        },
                      ]
                    },
                  ]
                },

                /* STEP 3 — PER-PHOTO EDITS */
                { label:"③ PER-PHOTO EDITS (tap any tile to edit individually)", depth:2, color:"#c77dff", borderColor:"#c77dff",
                  children:[
                    { label:"Transform", depth:3,
                      children:[
                        { label:"Pinch to zoom / scale photo within its tile", depth:4 },
                        { label:"Drag to reposition photo within tile", depth:4 },
                        { label:"Rotate — free angle or fixed 90° steps", depth:4 },
                        { label:"Flip horizontal / vertical", depth:4 },
                      ]
                    },
                    { label:"Colour & Tone", depth:3,
                      children:[
                        { label:"Brightness", depth:4 },
                        { label:"Contrast", depth:4 },
                        { label:"Saturation", depth:4 },
                        { label:"Warmth / Temperature", depth:4 },
                        { label:"Preset filter styles", depth:4 },
                      ]
                    },
                    { label:"AI Tools", depth:3,
                      children:[
                        { label:"Remove background — AI Cutout", depth:4 },
                        { label:"AI Enhance / Sharpen blurry photos", depth:4 },
                        { label:"AI Light — fix dark or flat exposures", depth:4 },
                      ]
                    },
                  ]
                },

                /* STEP 4 — OVERLAYS */
                { label:"④ OVERLAYS (applied over the whole canvas)", depth:2, color:"#c77dff", borderColor:"#c77dff",
                  children:[
                    { label:"Text", depth:3,
                      children:[
                        { label:"100+ font choices", depth:4 },
                        { label:"Font size, colour, opacity", depth:4 },
                        { label:"Text shadow & stroke / outline", depth:4 },
                        { label:"Text background / highlight box", depth:4 },
                        { label:"Free positioning + rotation", depth:4 },
                        { label:"Text animation styles (fade, slide, etc.)", depth:4 },
                      ]
                    },
                    { label:"Stickers — 1000+ library (themes, seasonal, emoji-style)", depth:3 },
                    { label:"Draw / Brush — freehand drawing over canvas", depth:3 },
                  ]
                },

                /* STEP 5 — EXPORT */
                { label:"⑤ EXPORT & SHARE", depth:2, color:"#c77dff", borderColor:"#c77dff",
                  children:[
                    { label:"Resolution: 720p / 1080p / 2K / 4K", depth:3 },
                    { label:"Format: JPG or PNG", depth:3 },
                    { label:"Save to Camera Roll", depth:3 },
                    { label:"Share direct → Instagram / TikTok / Facebook / WhatsApp", depth:3 },
                    { label:"Watermark: remove by watching ad, or InShot Pro subscription", depth:3 },
                  ]
                },

              ]
            }
          ]
        };

        function cls(depth){ return ["n0","n1","n2","n3","n4"][Math.min(depth,4)]; }
        function lc(depth,color){
          if(depth<=1) return color+"aa";
          if(depth===2) return color+"88";
          return "#252b3e";
        }

        function build(node){
          const hasKids = node.children && node.children.length > 0;
          const wrap = document.createElement("div");
          wrap.className = "level";

          const el = document.createElement("div");
          el.className = cls(node.depth);

          if(node.depth===1||node.depth===2){
            el.style.background = node.color+"18";
            el.style.borderColor = node.borderColor||node.color;
            el.style.color = node.color;
          }
          if(node.depth===3 && hasKids) el.classList.add("hasch");

          if(hasKids){
            const c=document.createElement("span");
            c.className="caret"; c.textContent="▾";
            el.appendChild(c);
          }
          const t=document.createElement("span"); t.textContent=node.label; el.appendChild(t);

          if(node.note){
            const n=document.createElement("span");
            n.style.cssText="font-size:0.6rem;color:#444;margin-left:8px;font-weight:400;";
            n.textContent=node.note; el.appendChild(n);
          }
          if(node.desc){
            const d=document.createElement("span");
            d.style.cssText="font-size:0.62rem;color:#666;margin-left:10px;font-weight:400;";
            d.textContent="— "+node.desc; el.appendChild(d);
          }
          wrap.appendChild(el);

          if(hasKids){
            const cw=document.createElement("div"); cw.className="children-wrap";
            const hIndent=node.depth===0?40:node.depth===1?26:20;
            const row2=document.createElement("div");
            row2.style.cssText="display:flex;margin-left:"+hIndent+"px;margin-top:4px;";

            const vl=document.createElement("div"); vl.className="connector-v";
            vl.style.background=lc(node.depth,node.color||"#444"); row2.appendChild(vl);

            const cb=document.createElement("div"); cb.style.cssText="display:flex;flex-direction:column;";
            node.children.forEach(child=>{
              const cr=document.createElement("div"); cr.className="row";
              const hl=document.createElement("div"); hl.className="connector-h";
              hl.style.background=lc(node.depth,node.color||"#444"); cr.appendChild(hl);
              cr.appendChild(build({...child, color:child.color||node.color, borderColor:child.borderColor||node.borderColor}));
              cb.appendChild(cr);
            });
            row2.appendChild(cb); cw.appendChild(row2); wrap.appendChild(cw);

            el.style.cursor="pointer";
            el.addEventListener("click",()=>{
              const hidden=wrap.classList.toggle("collapsed");
              const caret=el.querySelector(".caret");
              if(caret) caret.style.transform=hidden?"rotate(-90deg)":"rotate(0deg)";
            });
          }
          return wrap;
        }

        setTimeout(() => {
          const treeEl = document.getElementById("tree");
          if (treeEl) {
            treeEl.appendChild(build(TREE));
          }
        }, 100);
      `}} />
    </div>
  )
}
