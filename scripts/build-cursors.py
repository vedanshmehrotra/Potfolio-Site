"""Small original code-drawn UI sprites; never modifies studio artwork."""
from pathlib import Path
DEST = Path(__file__).resolve().parents[1] / 'assets' / 'cursors'
DEST.mkdir(parents=True, exist_ok=True)
PALETTE = {'x':'#071320','o':'#f1dfb7','+':'#c28f52'}
sprites = {
 'arrow': [
 'x','xx','xox','xoox','xooox','xoooox','xooooox','xoooooox','xooooooox',
 'xooooxxxxx','xoox+ox','xox xoox','xx  xoox','x    xx'],
 'point': [
 '     xxx','     xox','     xox','     xox','     xoxxxx','     xoxoxoxx',
 '     xoooooxox',' xxx xooooooox',' xooxxooooooox','  xoooooooooox',
 '   xoooooooox','   xoooooooox','    xoooooox','    x++++++x','    xxxxxxxx'],
 'grab': [
 '    xx xx',' xx xoxox xx',' xoxxoxoxxox',' xooooooooox',' xooooooooox',
 ' xooooooooox',' xooooooooox','xxooooooooox','xoooooooooox',' xoooooooox',
 '  xooooooox','   x+++++x','   xxxxxxx'],
 'closed': [
 '','', '   xxxxxxxx','  xxoxoxoxox','  xoooooooox','  xoooooooox',
 ' xxoooooooox',' xooooooooox',' xoooooooox','  xooooooox','   x+++++x','   xxxxxxx'],
 'pet': [
 '','    xx xx',' xx xoxox xx',' xoxxoxoxxox',' xooooooooox',' xooooooooox',
 ' xooooooooox','xxooooooooox','xoooooooooox',' xooooooooox','  xooooooox',
 '   xooooox','   x+++++x','   xxxxxxx'],
 'pet-bend': [
 '','','    xx xx',' xx xoxox xx',' xoxxoxoxxox',' xooooooooox',
 ' xooooooooox','xxooooooooox','xoooooooooox',' xooooooooox','  xooooooox',
 '   xooooox','   x+++++x','   xxxxxxx'],
}
def rects(rows, dx=0):
    return ''.join(f'<rect x="{x+dx}" y="{y}" width="1" height="1" fill="{PALETTE[c]}"/>'
                   for y,row in enumerate(rows) for x,c in enumerate(row) if c in PALETTE)
def svg(body, frames=1):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{32*frames}" height="32" viewBox="0 0 {16*frames} 16" shape-rendering="crispEdges">{body}</svg>\n'
for name, rows in sprites.items():
    (DEST / f'{name}.svg').write_text(svg(rects(rows)), encoding='utf-8')
(DEST / 'pet-sheet.svg').write_text(svg(''.join(rects(sprites[n],i*16) for i,n in enumerate(['pet','pet-bend','pet'])),3), encoding='utf-8')

def glass(level):
    rows=['  xxxxxxxxxxx','  xooooooooox','   x       x','   x       x','    x     x',
          '     x   x','      x x','       +','      x x','     x   x','    x     x',
          '   x       x','   x       x','  xooooooooox','  xxxxxxxxxxx']
    rows=[list(r.ljust(16)) for r in rows]
    sand=[[(x,y) for x in range(4+y-2,11-(y-2))] for y in range(2,6)]
    for y in range(2+level,6):
        for x,_ in sand[y-2]:
            if rows[y][x]==' ':rows[y][x]='+'
    for y in range(12-level,13):
        edges=[x for x,c in enumerate(rows[y]) if c=='x']
        for x in range(min(edges)+1,max(edges)):
            if rows[y][x]==' ':rows[y][x]='+'
    if level<3:
        rows[8+level][7]='+'
    return [''.join(row) for row in rows]
frames=[]
for i in range(8):
    content=rects(glass(min(i,3)))
    angle=0 if i<5 else (i-4)*45
    frames.append(f'<g transform="translate({i*16})"><g transform="rotate({angle} 7.5 7.5)">{content}</g></g>')
(DEST / 'wait-sheet.svg').write_text(svg(''.join(frames),8),encoding='utf-8')
(DEST / 'wait.svg').write_text(svg(rects(glass(0))),encoding='utf-8')
print('Original cursor SVGs built.')
