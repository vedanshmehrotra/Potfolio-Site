# Local cat expression experiment — 22 October 2026

The main studio still uses the original cat. This review is intentionally confined to its face and inner ears; it does not replace the body, paws, tail or room background, and is awaiting the user's approval.

## Sources and method

- `source-lit.png` / `source-dark.png`: exact analysis crops of the existing approved room reference frames, source rectangle (1160,390,210,100).
- `face-source.png`: exact 80 x 68 source crop at (1180,410) from the lit reference. No source artwork was painted or overwritten. The larger `*-detail.png` files are nearest-neighbor inspection aids only.
- `sleepy-eyes-v1.png`: one edited eye-expression reference, made with the built-in `image_gen` tool from `face-source.png`. Its full crop is preserved unchanged here. Only two small eye areas are consumed by the renderer; none of its generated ears, fur outline, paws, body or background is displayed.
- `cat-preview.js` samples the actual current video frame (or matched QA snapshot), adds the small eye patches, and moves existing face/inner-ear pixels by at most about two source pixels. Displacement falls to zero at the local face/ear boundaries. There are no pose dissolves, replacement room frames or static window patches.
- Notice and petting each use 20 ticks at 8 FPS (2.5 seconds), then clear the experimental canvas completely. Resting/breathing returns to the original video, byte for byte. Petting shares the existing hotspot/purr and a 3.2-second repeat limit. The small reaction deliberately does not lift the entire head or move the paws.
- Original cheek pixels calibrate eye color against the room's current lighting. Reduced motion holds the original resting cat. The camera pauses reaction progress; the local overlay follows the existing source-coordinate world.

## Exact image-generation prompt

Use case: precise-object-edit, identity-preserve. This is an EXACT CROPPED CLOSE-UP of the approved pixel-art studio's small sleeping calico cat; treat it as the edit target, NOT inspiration for a different cat. Change ONLY the two closed eyelids to relaxed, slightly open sleepy eyes, with muted olive-amber irises and narrow dark pupils looking toward the LEFT (the desk lamp). Keep the eyelid openings modest, no surprised wide eyes, no white eye shine. At original 80x68 reference coordinates, the left eye is in approximately x10..26,y39..48 and the right eye x39..66,y37..49. All fur, white central forehead blaze, nose, mouth, ears, head outline, head position, paws, body, proportions, background window reflections and crop must stay in EXACTLY their original positions. Do not raise or rotate the head. Do not add eyebrows, eyelashes, gloss, extra whiskers, feathers, outlines or fine detail. Match the existing subdued warm/cool lighting and low-resolution pixel clusters, no sharper new rendering. Output the SAME framing and aspect ratio as the input close-up, with the SAME size of cat in the frame. No borders, no labels, no text, no alternate panels, no sprite sheet. The only visible change should be slightly open sleepy eyes. This is a facial-expression source for a tiny local animation patch, so precise alignment and identity preservation are essential.

## Review

Open `/qa/cat-review.html`. Toggle the real lamp, use Pet cat (sound remains opt-in), compare against Original cat, and use the close-up/pose slider. The normal `/` studio loads the approved parrot but does not load this cat experiment. The user requested approval before promoting cat changes or pushing them to a live preview.

This is a restrained local motion test, not a claim of a fully redrawn, seamless cat animation. Bigger poses exposing the original silhouette still need a separately reviewed solution.
