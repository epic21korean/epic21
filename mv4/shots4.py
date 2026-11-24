import json
exec(open('/home/claude/mv2/shots.py').read())
R=json.load(open('refs4.json'))
STY=("Still frame from a premium stylized 3D CG animated feature film for adults (clearly 3D animation, not a photograph): sculpted 3D characters with realistic adult proportions, expressive refined faces, detailed hair and fabric, subtle painterly textures. "
 "Setting: a sleek futuristic luxury rooftop pool party in Seoul on a summer night - infinity pool, minimal white architecture, frosted glass, thin lilac and white LED light lines, chrome details, stylish fashionable 3D animated guests in the background, glittering city skyline. "
 "Cinematic lighting: luminous silver and pearl highlights, soft lilac and icy-blue light with warm golden accents, soft rim light, bright and clean, not dark, not oversaturated. "
 "Keep exactly the same faces, hairstyles and outfits as the reference images. No text, no letters, no numbers unless described, no logos, no watermark.")
W4="the 3D animated heroine from the reference ("+R['W4'].split(': ',1)[-1] if False else "the 3D animated heroine from the reference (sleek high ponytail, silver hair clips, iridescent silver-lilac cropped moto jacket, white ribbed halter top, pearl-grey pleated mini skirt with a thin chain belt, glossy white knee-high boots, layered silver necklaces, chrome ear cuffs)"
M4="the 3D animated hero from the reference (soft middle-parted fringe, oversized cropped silver-grey suede bomber jacket over a white tank top, layered silver chains, loose black wide-leg trousers, chunky white sneakers)"
FIX=[('the pocket of her dress','the pocket of her cropped jacket'),('her hot pink dress','her iridescent silver-lilac jacket sleeve'),('a pink bar stool','a sleek white bar stool'),
('a pink cocktail','a glass of sparkling water'),('a pink neon heart behind them','a soft lilac glowing heart-shaped light sculpture behind them'),('mint soda can','chilled silver soda can'),
('round white table','sleek round marble table'),('soft pink glow','soft lilac glow'),('a big pink heart icon','a big glowing heart icon'),('glowing with a pink heart icon','glowing with a heart icon')]
ANG={'close':["Close-up shot","Close-up from a different angle"],'two':["Wide cinematic shot from a low angle","Medium two-shot from the side"],'std':["Medium shot at eye level","Low-angle full-body shot"]}
P={}
for k,r,p in SHOTS:
    q=p.replace(W,W4).replace(M,M4)
    for a,b in FIX: q=q.replace(a,b)
    kind='close' if p.startswith(('Close-up','Extreme close-up')) else ('two' if r=='WM' or p.startswith('Wide') else 'std')
    for j,s in enumerate('AB'):
        P[k+s]=(r,f"{ANG[kind][j]}. {q} {STY}")
json.dump(P,open('prompts4.json','w'),ensure_ascii=False)
print(len(P)); print(P['i03A'][1][:500])
