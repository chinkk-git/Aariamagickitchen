from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json, glob, os, textwrap
ROOT=Path(__file__).resolve().parents[3]
REC=ROOT/'content/international/countries'
OUT=ROOT/'content/international/qa/previews'
W,H=1680,1440
BG=(255,249,241); WHITE=(255,255,255); INK=(48,42,56); MUTED=(105,94,115); BROWN=(112,79,50); PURPLE=(126,72,143); GREEN=(49,112,83); LINE=(230,211,189); RED=(171,54,65)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def f(size,b=False): return ImageFont.truetype(BOLD if b else FONT,size)
def wrap(draw, text, font, maxw):
    words=str(text).split(); lines=[]; cur=''
    for word in words:
        cand=(cur+' '+word).strip()
        if draw.textbbox((0,0),cand,font=font)[2] <= maxw: cur=cand
        else:
            if cur: lines.append(cur)
            cur=word
    if cur: lines.append(cur)
    return lines or ['']
def draw_wrapped(draw, xy, text, font, fill, maxw, linegap=3, maxlines=None):
    x,y=xy; lines=wrap(draw,text,font,maxw)
    if maxlines and len(lines)>maxlines:
        lines=lines[:maxlines]
        while lines[-1] and draw.textbbox((0,0),lines[-1]+'…',font=font)[2]>maxw: lines[-1]=lines[-1][:-1]
        lines[-1]=lines[-1].rstrip()+'…'
    lh=draw.textbbox((0,0),'Ag',font=font)[3]+linegap
    for line in lines: draw.text((x,y),line,font=font,fill=fill); y+=lh
    return y
def box(draw,xy,r=20,fill=WHITE,outline=LINE): draw.rounded_rectangle(xy,radius=r,fill=fill,outline=outline,width=2)
def getimg(path,maxsize):
    im=Image.open(ROOT/path).convert('RGB'); im.thumbnail(maxsize,Image.Resampling.LANCZOS); return im
def localized(x,key,default=''):
    v=x.get(key,default)
    return v if isinstance(v,str) else (v.get('en-GB',default) if isinstance(v,dict) else default)
def name_for(item,lang):
    name=item.get('name',{})
    return name.get(lang,'') if isinstance(name,dict) else str(name)
def nutrient(v,unit):
    if v is None: return 'Pending review / Revisão pendente'
    if isinstance(v,float): s=f'{v:g}'
    else:s=str(v)
    return s+' '+unit

def render(data,path):
    im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    # banner
    box(d,(34,24,W-34,126),r=24,fill=(255,253,250))
    d.text((58,44),'W03 CONTENT PREVIEW  •  NOT AN ANDROID SCREENSHOT',font=f(22,True),fill=BROWN)
    d.text((58,82),f"#{data['id']}  ·  {data['country'].title()}  ·  {data['servings']} servings / porções",font=f(21,True),fill=INK)
    d.text((820,36),data['title']['en-GB'],font=f(28,True),fill=(55,37,73))
    d.text((820,77),data['title']['pt-BR'],font=f(23,True),fill=PURPLE)
    # cards row
    box(d,(34,148,480,600)); box(d,(500,148,1175,600)); box(d,(1195,148,1646,600))
    d.text((52,166),'FINAL DISH / PRATO FINAL',font=f(18,True),fill=BROWN)
    art=data['finished_dish']['image']['path']; dish=getimg(art,(390,350)); im.paste(dish,(57+(390-dish.width)//2,205+(345-dish.height)//2))
    d.text((520,166),'INGREDIENTS / INGREDIENTES',font=f(18,True),fill=BROWN)
    items=data.get('content',{}).get('ingredients',[])
    cols=[items[:(len(items)+1)//2],items[(len(items)+1)//2:]]
    colx=[520,850]; colw=308; rowh=72
    for ci,group in enumerate(cols):
        for ri,item in enumerate(group):
            x=colx[ci]; y=204+ri*rowh
            d.rounded_rectangle((x,y,x+colw,y+rowh-5),radius=11,fill=(255,250,243),outline=(237,222,203),width=1)
            d.ellipse((x+9,y+10,x+25,y+26),outline=GREEN,width=2)
            qty=item.get('quantity'); unit=item.get('unit',''); q=('Optional · ' if item.get('optional') else '')+(str(qty)+' '+str(unit)).strip()
            d.text((x+32,y+5),q,font=f(12,True),fill=GREEN)
            ty=y+22
            ty=draw_wrapped(d,(x+32,ty),name_for(item,'en-GB'),f(12,True),INK,colw-40,linegap=1,maxlines=2)
            draw_wrapped(d,(x+32,ty),name_for(item,'pt-BR'),f(11),MUTED,colw-40,linegap=1,maxlines=2)
    # nutrition / allergens
    d.text((1215,166),'PER SERVING / POR PORÇÃO',font=f(17,True),fill=BROWN)
    nut=data.get('nutrition',{}).get('per_serving',{})
    fields=[('Energy / Energia',nut.get('energyKcal'),'kcal'),('Protein / Proteína',nut.get('proteinG'),'g'),('Carbohydrate / Carboidrato',nut.get('carbohydrateG'),'g'),('Fat / Gordura',nut.get('fatG'),'g'),('Fibre / Fibra',nut.get('fibreG'),'g'),('Sat. fat / Gord. sat.',nut.get('saturatedFatG'),'g'),('Sodium / Sódio',nut.get('sodiumMg'),'mg')]
    yy=201
    for label,val,unit in fields:
        d.line((1214,yy+24,1627,yy+24),fill=(238,226,210),width=1)
        d.text((1215,yy),label,font=f(12),fill=MUTED)
        text=nutrient(val,unit); ff=f(11,True) if val is None else f(13,True)
        tw=d.textbbox((0,0),text,font=ff)[2]
        d.text((1625-tw,yy),text,font=ff,fill=RED if val is None else GREEN); yy+=31
    yy+=9
    d.text((1215,yy),'ALLERGENS / ALERGÊNICOS',font=f(15,True),fill=RED); yy+=25
    allergens=', '.join(data.get('allergens',[])) or 'None listed / Nenhum listado'
    yy=draw_wrapped(d,(1215,yy),allergens,f(12,True),INK,405,linegap=2,maxlines=2)+6
    d.text((1215,yy),'CROSS-CONTACT / CONTATO CRUZADO',font=f(13,True),fill=RED); yy+=22
    cc=data.get('allergen_notes',{}).get('crossContact',data.get('allergen_notes',{}).get('cross_contact',{}))
    yy=draw_wrapped(d,(1215,yy),cc.get('en-GB',''),f(9),INK,405,linegap=1,maxlines=4)+4
    draw_wrapped(d,(1215,yy),cc.get('pt-BR',''),f(9),MUTED,405,linegap=1,maxlines=4)
    # adult assistance panel
    box(d,(34,618,1646,740),r=18,fill=(241,249,244),outline=(190,224,207))
    d.text((56,630),'ADULT ASSISTANCE / AJUDA DE UM ADULTO',font=f(17,True),fill=GREEN)
    assist=data.get('adult_assistance',{})
    draw_wrapped(d,(56,662),assist.get('en-GB',''),f(13),INK,740,linegap=2,maxlines=3)
    draw_wrapped(d,(850,662),assist.get('pt-BR',''),f(13),INK,760,linegap=2,maxlines=3)
    d.text((37,755),'ILLUSTRATED STEPS / ETAPAS ILUSTRADAS  •  FIRST / MIDDLE / FINAL',font=f(18,True),fill=BROWN)
    steps=data['steps']; indexes=[0,(len(steps)-1)//2,len(steps)-1]
    x0=34; gap=22; cw=(W-68-2*gap)//3; top=790; bottom=1404
    for ci,si in enumerate(indexes):
        x=x0+ci*(cw+gap); box(d,(x,top,x+cw,bottom),r=19)
        s=steps[si]; art=getimg(s['artwork']['path'],(cw-40,260)); im.paste(art,(x+(cw-art.width)//2,top+14))
        y=top+284
        d.text((x+18,y),f"STEP {si+1} / ETAPA {si+1}",font=f(14,True),fill=BROWN); y+=24
        y=draw_wrapped(d,(x+18,y),s['title']['en-GB'],f(17,True),(55,37,73),cw-36,linegap=1,maxlines=2)+2
        y=draw_wrapped(d,(x+18,y),s['title']['pt-BR'],f(15,True),PURPLE,cw-36,linegap=1,maxlines=2)+5
        y=draw_wrapped(d,(x+18,y),s['instruction']['en-GB'],f(12),INK,cw-36,linegap=2,maxlines=4)+5
        draw_wrapped(d,(x+18,y),s['instruction']['pt-BR'],f(12),MUTED,cw-36,linegap=2,maxlines=4)
    # footer
    status=data.get('nutrition',{}).get('status','')
    d.text((38,1414),f"Source: W03 recipe package #{data['id']} · EN-GB + PT-BR · nutrition: {status} · artwork rights: independent review pending",font=f(10),fill=MUTED)
    im.save(path,'JPEG',quality=80,optimize=True,progressive=True,subsampling=0)

recipes=[]
for fn in sorted(glob.glob(str(REC/'*'/'*'/'recipe.json'))):
    data=json.load(open(fn))
    if 96<=int(data['id'])<=110: recipes.append(data)
assert len(recipes)==15, len(recipes)
for data in sorted(recipes,key=lambda x:int(x['id'])):
    code={'italy':'italy','china':'china','japan':'japan','mexico':'mexico','vietnam':'vietnam'}[data['country']]
    path=OUT/f"{data['id']:03d}-{code}.jpg"; render(data,path)
# Contact sheets grouped by country, with the 3 individual preview images in each.
for country in ['italy','china','japan','mexico','vietnam']:
    group=[x for x in sorted(recipes,key=lambda x:int(x['id'])) if x['country']==country]
    sheet=Image.new('RGB',(1680,680),BG); d=ImageDraw.Draw(sheet)
    d.text((40,25),f"W03 CONTENT PREVIEW CONTACT SHEET · {country.upper()} · NOT ANDROID SCREENSHOTS",font=f(23,True),fill=BROWN)
    for i,data in enumerate(group):
        key=f"{data['id']:03d}-{country}.jpg"; p=OUT/key
        card=Image.open(p).convert('RGB'); card.thumbnail((510,430),Image.Resampling.LANCZOS)
        x=35+i*555; y=95
        box(d,(x,y,x+525,555),r=16)
        sheet.paste(card,(x+8,y+8))
        d.text((x+10,570),f"#{data['id']} · {data['title']['en-GB']}",font=f(16,True),fill=INK)
        d.text((x+10,595),data['title']['pt-BR'],font=f(14),fill=PURPLE)
    sheet.save(OUT/f"contact-{country}.jpg",'JPEG',quality=80,optimize=True,progressive=True,subsampling=0)
# Global index poster with clickable-index companion.
sheet=Image.new('RGB',(1800,1130),BG); d=ImageDraw.Draw(sheet)
d.text((40,25),'W03 INTERNATIONAL RECIPES · 15 CONTENT PREVIEWS · NOT ANDROID SCREENSHOTS',font=f(24,True),fill=BROWN)
for i,data in enumerate(sorted(recipes,key=lambda x:int(x['id']))):
    row,col=divmod(i,5); x=25+col*355; y=90+row*335
    box(d,(x,y,x+335,y+320),r=14)
    card=Image.open(OUT/f"{data['id']:03d}-{data['country']}.jpg").convert('RGB'); card.thumbnail((315,270),Image.Resampling.LANCZOS)
    sheet.paste(card,(x+10,y+8))
    d.text((x+12,y+278),f"#{data['id']} {data['country'].title()}",font=f(15,True),fill=INK)
    d.text((x+12,y+298),data['title']['en-GB'][:34],font=f(12),fill=PURPLE)
sheet.save(OUT/'contact-all-15.jpg','JPEG',quality=80,optimize=True,progressive=True,subsampling=0)
print('Rendered',len(recipes),'recipes')
for p in sorted(OUT.glob('*.jpg')): print(p.name,p.stat().st_size)
