#!/usr/bin/env python3
"""Generate isolated, unapproved W03 step-atlas pilot revisions from the verified draft ZIP."""
import base64, hashlib, json, re, io
from pathlib import Path
from xml.etree import ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = Path('/workspace/scratch/b456cba61a88/atlas-review/tools/v3/artwork/step-atlas-staging')
CHEF = Path(__file__).resolve().parents[1] / 'approved-chef-a.webp.b64'
chef_webp = base64.b64decode(CHEF.read_text().strip())
chef_sha = hashlib.sha256(chef_webp).hexdigest()
chef_png_io = io.BytesIO(); Image.open(io.BytesIO(chef_webp)).convert('RGBA').save(chef_png_io,format='PNG',optimize=True)
chef_png = chef_png_io.getvalue()
chef_data = 'data:image/png;base64,' + base64.b64encode(chef_png).decode('ascii')
chef_png_sha = hashlib.sha256(chef_png).hexdigest()
catalog_sha = hashlib.sha256(Path(__file__).resolve().parents[4].joinpath('index.html').read_bytes()).hexdigest()

RECIPES = {
  27: dict(title='Chicken & Carrot Nuggets', source_group='11-29', file='recipe-27-chicken-carrot-nuggets-a09-draft.svg',
    ingredients=['250 g ground chicken','½ cup finely grated carrot','1 egg','⅓ cup breadcrumbs','pinch of salt'],
    source_steps=['Adult handles raw chicken.','Mix ingredients using clean utensils; shape small flattened nuggets.','Adult air-fries until centers reach 74°C, checking with thermometer.'],
    panels=[
      ('Adult handles raw chicken','Um adulto manuseia o frango cru','An adult handles the raw chicken on a clean tray.',True,'raw','raw chicken • clean tray','Raw chicken stays with an adult.'),
      ('Adult mixes with clean tools','Um adulto mistura com utensílios limpos','An adult mixes the raw chicken with clean tools.',True,'mixraw','chicken • carrot • egg','Clean tools keep raw chicken separate.'),
      ('Adult shapes small flat nuggets','Um adulto modela nuggets achatados','An adult shapes the raw mixture into small, flat nuggets.',True,'shape','raw chicken • breadcrumbs • carrot','The mixture still contains raw chicken.'),
      ('Adult uses the air fryer','Só adulto usa a air fryer','An adult places the nuggets in the air fryer.',True,'airfryer','nuggets • air fryer','Hot appliance: adult only.'),
      ('Check every centre: 74°C','Adulto confere 74°C no centro','An adult checks that each nugget centre reaches 74°C.',True,'thermo','nugget • thermometer','Use a food thermometer; adult checks.'),
      ('Wait for an adult to serve after cooling','Espere um adulto servir após esfriar','Wait until an adult says the nuggets are cool enough, then ask them to serve.',False,'coolnuggets','nuggets • plate','Adult checks safe cooling and serves.' )]),
  39: dict(title='Chicken & Corn Mini Pancakes', source_group='30-47', file='recipe-39-step-atlas-draft.svg',
    ingredients=['½ cup fully cooked shredded chicken','¼ cup corn','1 egg','¼ cup flour','2 tbsp milk'],
    source_steps=['Mix all ingredients into thick batter.','Adult cooks small spoonfuls in a lightly oiled pan until centers are fully cooked.'],
    panels=[
      ('Mix the batter','Misture a massa','Mix cooked chicken, corn, egg, flour and milk. Wash hands after touching raw egg; do not taste raw batter.',False,'mixbatter','cooked chicken • corn + egg • flour + milk','Wash hands after touching raw egg. Do not taste raw batter.'),
      ('Adult spoons batter into pan','Um adulto coloca a massa na frigideira','An adult puts small spoonfuls into the lightly oiled pan.',True,'panpour','batter • pan','Hot pan: adult only.'),
      ('Adult cooks the pancakes','Um adulto cozinha as panquequinhas','An adult cooks the pancakes until their centres are fully cooked.',True,'pancakes','pancakes • pan','Hot pan: adult only.'),
      ('Adult flips each pancake','Um adulto vira cada panquequinha','An adult flips the pancakes with a spatula.',True,'flip','pancake • spatula','Hot pan and spatula: adult only.'),
      ('Adult checks the centre','Um adulto confere o centro','An adult checks that the middle is cooked through. Keep uncooked batter away from ready-to-eat food.',True,'checkpancake','pancake • cooked centre','Keep uncooked batter off ready-to-eat food.'),
      ('Cool before serving','Espere esfriar antes de servir','Let the pancakes cool before they are served.',False,'coolpancakes','pancakes • serving plate','Wait until food is comfortably cool.')]),
  40: dict(title='Apple Sandwich Smiles', source_group='30-47', file='recipe-40-step-atlas-draft.svg',
    ingredients=['1 apple','2 tbsp peanut or sunflower seed butter','½ banana'],
    source_steps=['Adult cuts and cores apple into thin slices.','Spread with seed or nut butter if allergy-safe.','Add banana smiles and serve.'],
    panels=[
      ('Adult slices the apple','Um adulto corta a maçã','An adult cuts the apple into thin slices.',True,'applecut','apple • knife • board','Knife: adult only.'),
      ('Adult removes the core','Um adulto tira o miolo','An adult cores the apple with a knife or corer.',True,'applecore','apple • corer','Sharp tool: adult only.'),
      ('Ask adult: safe spread','Adulto confere o creme','Ask an adult to confirm the peanut or sunflower spread is allergy-safe.',True,'allergycheck','spread options','Check allergies before opening or serving.'),
      ('Spread the approved filling','Espalhe o recheio aprovado','Spread the adult-approved filling on an apple slice.',False,'spread','apple • safe spread','Use only the spread your adult approved.'),
      ('Add banana smiles','Faça carinhas com banana','Place banana slices on top to make smiles.',False,'bananas','banana • apple','Use clean hands or a clean spoon.'),
      ('Stack, then serve','Empilhe e sirva','Stack two apple slices with the approved filling and banana between them, then serve.',False,'appleserve','apple • banana • safe spread','Serve only the allergy-safe version.')]),
  51: dict(title='Masala Cheese Toast', source_group='48-65', file='recipe-51-step-atlas-draft.svg',
    ingredients=['2 bread slices','½ cup grated cheese','2 tbsp diced tomato','2 tbsp diced capsicum','pinch chaat masala'],
    source_steps=['Scatter cheese, finely diced vegetables and a tiny pinch of chaat masala on bread.','Adult air-fries until melted and toast is crisp.'],
    panels=[
      ('Set out bread and toppings','Separe o pão e os ingredientes','Place bread, cheese, tomato, capsicum and masala on a clean board.',False,'toastsetup','bread • cheese • vegetables','Use only the listed toppings.'),
      ('Add cheese and vegetables','Cubra com queijo e legumes','Scatter cheese, tomato and capsicum over the bread.',False,'toasttop','cheese • tomato • capsicum','Keep small diced pieces on the bread.'),
      ('Sprinkle a tiny pinch','Polvilhe uma pitadinha','Add just a tiny pinch of chaat masala.',False,'masala','chaat masala • measuring pinch','A tiny pinch is enough.'),
      ('Adult uses the air fryer','Só adulto usa a air fryer','An adult places the toast in the air fryer.',True,'toastair','toast • air fryer','Hot appliance: adult only.'),
      ('Adult checks crisp and melted','Adulto confere e deixa esfriar','An adult checks the cheese is melted and toast is crisp, then sets it on a cooling rack.',True,'toastcheck','melted cheese • crisp toast','Adult handles hot toast; cool before serving.'),
      ('Wait for adult to confirm it is cool','Espere o adulto confirmar que esfriou','Wait until an adult confirms the toast is cool enough to eat, then ask them to serve it.',True,'toastserve','toast • plate','Adult confirms safe temperature and serves.')]),
  63: dict(title='Coconut Ladoo', source_group='48-65', file='recipe-63-step-atlas-draft.svg',
    ingredients=['1 cup fine desiccated coconut','⅓ cup sweetened condensed milk (adjust)','pinch cardamom'],
    source_steps=['Mix coconut, condensed milk and cardamom into a moldable mixture.','Roll into small balls and refrigerate until firm.'],
    panels=[
      ('Mix coconut and condensed milk','Misture o coco e o leite condensado','Stir coconut and condensed milk together.',False,'ladoomix','coconut • condensed milk','Condensed milk contains dairy.'),
      ('Add a tiny pinch of cardamom','Pitada de cardamomo','Add a tiny pinch of cardamom and mix.',False,'cardamom','cardamom • coconut','Keep the pinch small.'),
      ('Roll small ladoo balls','Enrole bolinhas de ladoo','Roll the mixture into small balls with clean hands.',False,'ladooform','coconut mixture • clean hands','Wash hands before rolling.'),
      ('Place balls on clean tray','Ponha na bandeja limpa','Set each ball on a clean tray.',False,'ladootray','ladoo balls • tray','Leave a little space between balls.'),
      ('Chill until firm','Leve à geladeira até firmar','Refrigerate the tray until the balls are firm.',False,'ladoofridge','tray • refrigerator','Ask an adult for help if the fridge shelf is high.'),
      ('Serve the chilled ladoo','Sirva o ladoo gelado','Serve the ladoo once it is firm and chilled.',False,'ladooserve','coconut • dairy • plate','Contains dairy from condensed milk.')])
}

PT_ING = {
  'raw chicken':'frango cru','clean tray':'bandeja limpa','chicken':'frango','carrot':'cenoura','egg':'ovo','breadcrumbs':'farinha de rosca','salt':'sal','nuggets':'nuggets','air fryer':'air fryer','nugget':'nugget','thermometer':'termômetro','plate':'prato','cooked chicken':'frango cozido','corn':'milho','corn + egg':'milho + ovo','flour + milk':'farinha + leite','batter':'massa','pan':'frigideira','pancakes':'panquequinhas','pancake':'panquequinha','spatula':'espátula','cooked centre':'centro cozido','serving plate':'prato de servir','apple':'maçã','knife':'faca','board':'tábua','corer':'descaroçador','peanut / sunflower':'amendoim / girassol','spread options':'opções de creme','safe spread':'creme seguro','banana':'banana','bread':'pão','cheese':'queijo','vegetables':'legumes','tomato':'tomate','capsicum':'pimentão','chaat masala':'chaat masala','measuring pinch':'pitada','toast':'torrada','melted cheese':'queijo derretido','crisp toast':'torrada crocante','coconut':'coco','condensed milk':'leite condensado','cardamom':'cardamomo','coconut mixture':'mistura de coco','clean hands':'mãos limpas','ladoo balls':'bolinhas de ladoo','tray':'bandeja','refrigerator':'geladeira','dairy':'leite','ladoo':'ladoo'
}

def esc(s):
  return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')
def sha(b): return hashlib.sha256(b).hexdigest()

def revision_reason(rid,panel):
  reasons={
    (27,2):'Safety correction: W07 flagged raw-chicken mixing without adultOnlyCue; now adult-only and clean-tool action is explicit.',
    (27,3):'Raw chicken remains in mixture; panel now keeps shaping adult-only until cooking.',
    (27,4):'Hot air-fryer action receives explicit adult-only cue.',
    (27,5):'Thermometer check is adult-only; 74°C from source text is prominent.',
    (27,6):'Cooling/serving remains adult-led; wait-before-serving is explicit.',
    (39,2):'Safety correction: W07 flagged hot-pan batter placement without adultAssist; now adult-only.',
    (39,3):'Hot-pan cooking is adult-only and the fully-cooked centre is explicit.',
    (39,4):'Safety correction: W07 flagged flipping a hot pancake without adultAssist; now adult-only.',
    (39,5):'Adult-only centre check now depicts a cut-open pancake and states fully cooked.',
    (39,6):'Added a distinct cool-before-serving panel; this supplementary cue needs A08 review.',
    (40,1):'Sharp-tool apple slicing is explicitly adult-only.',
    (40,2):'Safety correction: W07 flagged coring with an adult knife while adultAssist was false; now adult-only.',
    (40,3):'Allergy ambiguity is surfaced as an adult confirmation before a spread is opened or served.',
    (51,1):'Recipe 51 six-panel redesign: clear set-out action, bilingual instruction and readable ingredient tags.',
    (51,2):'Recipe 51 six-panel redesign: distinct topping action with step-specific scene and tags.',
    (51,3):'Recipe 51 six-panel redesign: separate tiny-pinch seasoning action.',
    (51,4):'Recipe 51 six-panel redesign: air-fryer operation is explicitly adult-only.',
    (51,5):'Recipe 51 six-panel redesign: adult checks crisp/melted state and places hot toast on cooling rack.',
    (51,6):'Recipe 51 six-panel redesign: wait for adult safe-temperature check before serving.',
    (63,1):'Source-derived no-heat mixing panel; dairy-containing condensed milk is identified.',
    (63,2):'Source-derived cardamom addition is separated from the mixing scene for clearer sequence.',
    (63,3):'Source-derived hand-rolling panel with clean-hand cue.',
    (63,4):'Source-derived clean-tray placement panel.',
    (63,5):'Source requires refrigeration but no hot/sharp/raw action; adult help is conditional only if the shelf is high.',
    (63,6):'Source-derived chilled serving panel; dairy note remains accessible in the panel description.'
  }
  return reasons.get((rid,panel),'Panel redraw for the shared pilot convention; independent review pending.')

def scene_svg(kind, x, y):
  # bright, thick-outline vector scenes; drawings are deliberately generic, not claims of culinary precision.
  ink='#51465f'; gold='#f5b94f'; peach='#ffcfb9'; green='#91c982'; red='#e7796b'; cream='#fffaf0'; steel='#afbac8'
  p=[]
  def rect(a,b,w,h,fill,rx=18,stroke=ink,sw=5): p.append(f'<rect x="{a}" y="{b}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
  def circ(a,b,r,fill,stroke=ink,sw=4): p.append(f'<circle cx="{a}" cy="{b}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
  def txt(a,b,t,size=20,fill=ink,weight=700): p.append(f'<text x="{a}" y="{b}" text-anchor="middle" font-family="Arial,sans-serif" font-size="{size}" font-weight="{weight}" fill="{fill}">{esc(t)}</text>')
  # scene origin is cell-relative. Keep a large, clear action silhouette inside a consistent picture stage.
  if kind in ('raw','mixraw','mixbatter','ladoomix','cardamom'):
    rect(x+96,y+24,224,138,'#d7e9f5',30)
    p.append(f'<path d="M{x+112} {y+80} Q{x+208} {y+186} {x+304} {y+80} L{x+286} {y+145} Q{x+208} {y+193} {x+130} {y+145}Z" fill="#fff" stroke="{ink}" stroke-width="6"/>')
    if kind=='raw':
      rect(x+167,y+72,83,51,'#e9988e',16)
      p.append(f'<path d="M{x+170} {y+98} q18 -33 42 0 q20 26 36 1" fill="none" stroke="#bd5f60" stroke-width="6"/>')
      txt(x+210,y+210,'Adult only • Só adulto',18,'#8f3434')
    else:
      if kind=='mixraw':
        rect(x+149,y+92,37,25,'#e9988e',9,'#bd5f60',3)
        circ(x+215,y+119,13,gold); circ(x+256,y+101,13,green)
      elif kind=='mixbatter':
        circ(x+166,y+118,13,'#9c6a44'); circ(x+208,y+114,13,gold); circ(x+251,y+103,13,'#fff1d2')
      elif kind=='cardamom':
        for xx,yy in [(154,105),(183,96),(215,109),(248,99)]:
          p.append(f'<ellipse cx="{x+xx}" cy="{y+yy}" rx="10" ry="5" fill="#7c9b5b" stroke="#526d42" stroke-width="2" transform="rotate(-25 {x+xx} {y+yy})"/>')
      else:
        for xx,yy,c in [(165,112,red),(207,121,gold),(251,105,green)]: circ(x+xx,y+yy,14,c)
      p.append(f'<path d="M{x+224} {y+42} l35 54" stroke="{steel}" stroke-width="9" stroke-linecap="round"/>')
      txt(x+208,y+210,'Stir • Misture',21)
  elif kind in ('shape','ladooform'):
    rect(x+62,y+32,288,142,'#e7c99a',20)
    for i,(xx,yy) in enumerate([(122,94),(203,86),(282,101)]):
      if kind=='shape': rect(x+xx-30,y+yy-18,60,42,'#d88f88',18,'#9e514c',4)
      else: circ(x+xx,y+yy,24,'#fff4dc','#b18e67',4)
    p.append(f'<path d="M{x+92} {y+196} Q{x+205} {y+239} {x+319} {y+196}" fill="none" stroke="#58a4a6" stroke-width="7" stroke-linecap="round"/>')
    txt(x+205,y+239,'Small, even • Iguais',18)
  elif kind in ('airfryer','toastair'):
    rect(x+105,y+31,205,154,'#c5d1dc',25)
    rect(x+128,y+60,159,73,'#eef6fa',12)
    for xx in (162,205,248): circ(x+xx,y+94,10,gold)
    rect(x+126,y+144,163,27,'#8595a6',10)
    for i in range(3): p.append(f'<path d="M{x+151+i*48} {y+49} q-16 -16 0 -30" fill="none" stroke="#e98463" stroke-width="5"/>')
    txt(x+208,y+220,'Adult only • Só adulto',18,'#8f3434')
  elif kind in ('thermo','checkpancake','toastcheck'):
    if kind=='thermo':
      for xx in (156,210,264): rect(x+xx-26,y+72,52,38,'#d99b58',15,'#9a6a43',4)
      p.append(f'<path d="M{x+208} {y+39} v76" stroke="#d65050" stroke-width="10" stroke-linecap="round"/>'); circ(x+208,y+124,19,'#e76f66')
      txt(x+208,y+217,'74°C • adulto confere',18,'#8f3434')
    else:
      rect(x+95,y+47,228,128,'#e3aa64',26)
      p.append(f'<path d="M{x+204} {y+66} v89" stroke="#805833" stroke-width="4" stroke-dasharray="8 8"/>')
      circ(x+158,y+111,16,'#fff1d2'); circ(x+251,y+111,16,'#fff1d2')
      if kind=='checkpancake':
        p.append(f'<path d="M{x+204} {y+68} v88" stroke="#805833" stroke-width="4" stroke-dasharray="8 8"/>')
        circ(x+158,y+111,16,'#d99b58','#9a6a43',3); circ(x+251,y+111,16,'#d99b58','#9a6a43',3)
        p.append(f'<path d="M{x+225} {y+118} l13 13 24 -29" fill="none" stroke="#43854d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>')
        txt(x+208,y+216,'Golden centre • Centro dourado',17)
      else:
        rect(x+111,y+58,194,72,'#e9bd67',16,'#9a6a43',5)
        p.append(f'<path d="M{x+128} {y+93} q20 -23 40 0 t40 0 t40 0 t40 0" fill="none" stroke="#f5e7b6" stroke-width="10" stroke-linecap="round"/>')
        p.append(f'<path d="M{x+105} {y+154} h206 M{x+117} {y+166} h182 M{x+126} {y+142} v34 M{x+289} {y+142} v34" stroke="#758697" stroke-width="5" stroke-linecap="round"/>')
        p.append(f'<path d="M{x+314} {y+112} q23 7 28 25 l-14 12 -25 -18" fill="#d7b595" stroke="{ink}" stroke-width="4" stroke-linejoin="round"/>')
        txt(x+208,y+216,'Melted • crisp • cool • Derretido • crocante • esfriar',14)
  elif kind in ('coolnuggets','coolpancakes','toastserve'):
    rect(x+69,y+58,276,100,'#d8edf1',22)
    for xx in (123,207,290): p.append(f'<path d="M{x+xx} {y+93} h1" stroke="#7aa4aa" stroke-width="6"/>')
    for xx in (139,209,279): p.append(f'<path d="M{x+xx} {y+40} q-14 -22 0 -37" fill="none" stroke="#c9a25f" stroke-width="5"/>')
    circ(x+208,y+214,31,'#fff4d4','#bb995e',5); p.append(f'<path d="M{x+208} {y+214} v-18 M{x+208} {y+214} l17 8" stroke="{ink}" stroke-width="5" stroke-linecap="round"/>')
    if kind=='coolnuggets': txt(x+208,y+240,'Adult serves • Adulto serve',16)
    elif kind=='toastserve': txt(x+208,y+240,'Adult serves • Adulto serve',16)
    else: txt(x+208,y+240,'Wait until cool • Espere esfriar',16)
  elif kind in ('panpour','pancakes','flip'):
    p.append(f'<ellipse cx="{x+208}" cy="{y+125}" rx="125" ry="62" fill="#656f7d" stroke="{ink}" stroke-width="6"/>')
    p.append(f'<path d="M{x+312} {y+117} l70 -31" stroke="{ink}" stroke-width="19" stroke-linecap="round"/>')
    if kind=='panpour': p.append(f'<path d="M{x+145} {y+28} q25 18 50 0 l-12 36 q-13 10 -26 0Z" fill="#fff0ca" stroke="{ink}" stroke-width="5"/>')
    else:
      for xx in (162,208,254): circ(x+xx,y+124,20,'#f5d17e','#bd9452',3)
      if kind=='flip': p.append(f'<path d="M{x+184} {y+49} q-40 -42 8 -54" fill="none" stroke="#58a4a6" stroke-width="7" marker-end="url(#arrow)"/>')
    txt(x+208,y+221,'Adult at hot pan • Adulto na panela',16,'#8f3434')
  elif kind in ('applecut','applecore'):
    rect(x+74,y+42,268,140,'#e6c88f',20)
    if kind=='applecut':
      circ(x+205,y+111,50,'#e76f66','#9e4a48',4); p.append(f'<path d="M{x+205} {y+60} q9 -18 20 -23" stroke="#6e824c" stroke-width="8" fill="none"/>')
      p.append(f'<path d="M{x+269} {y+40} l-81 109" stroke="#8d9aaa" stroke-width="13" stroke-linecap="round"/>')
    else:
      circ(x+159,y+111,45,'#f8d997','#b18d4b',4); circ(x+256,y+111,45,'#f8d997','#b18d4b',4); circ(x+208,y+111,11,'#c1754e')
    txt(x+208,y+220,'Adult only • Só adulto',18,'#8f3434')
  elif kind=='allergycheck':
    rect(x+92,y+38,232,136,'#e7f0de',20)
    circ(x+158,y+104,39,'#fff','#6e9c68',4); txt(x+158,y+114,'✓',48,'#498e4f')
    rect(x+222,y+74,62,60,'#fff1d2',12,'#bd9557',4); txt(x+253,y+111,'?',32)
    txt(x+208,y+220,'Adult checks • Adulto confere',17,'#8f3434')
  elif kind in ('spread','bananas','appleserve'):
    rect(x+71,y+53,274,130,'#efd1a3',22)
    p.append(f'<path d="M{x+117} {y+125} Q{x+208} {y+67} {x+299} {y+125} Q{x+208} {y+169} {x+117} {y+125}Z" fill="#ffe19a" stroke="{ink}" stroke-width="5"/>')
    if kind=='spread': circ(x+208,y+120,29,'#a86b48','#77442f',4)
    elif kind=='appleserve':
      p.append(f'<path d="M{x+125} {y+105} Q{x+207} {y+54} {x+289} {y+105} Q{x+207} {y+151} {x+125} {y+105}Z" fill="#ef9d79" stroke="{ink}" stroke-width="5"/>')
      p.append(f'<path d="M{x+125} {y+143} Q{x+207} {y+92} {x+289} {y+143} Q{x+207} {y+181} {x+125} {y+143}Z" fill="#edb278" stroke="{ink}" stroke-width="5"/>')
      rect(x+160,y+123,96,15,'#a86b48',7,'#77442f',3)
      for xx in (185,231): circ(x+xx,y+99,5,'#7d543c','#7d543c',1)
      txt(x+208,y+220,'Two slices • Duas fatias',16)
    else:
      circ(x+180,y+116,10,red); circ(x+236,y+116,10,red); p.append(f'<path d="M{x+178} {y+139} q30 25 60 0" stroke="#65424a" stroke-width="6" fill="none"/>')
      txt(x+208,y+220,'Clean hands • Mãos limpas',18)
  elif kind in ('toastsetup','toasttop','masala'):
    rect(x+64,y+46,288,134,'#e6c88f',20)
    for xx,yy in [(137,104),(278,104)]: rect(x+xx-48,y+yy-30,96,60,'#f0c26f',13,'#ae7e43',4)
    if kind!='toastsetup':
      for xx,yy,c in [(136,99,'#f5d16c'),(161,111,red),(184,100,green),(258,104,'#f5d16c'),(283,114,red),(307,102,green)]: circ(x+xx,y+yy,8,c,'#ffffff',2)
    if kind=='masala':
      for i in range(5): circ(x+192+i*9,y+71,3,'#8d5840','#8d5840',1)
    caption={'toastsetup':'Set out • Separe','toasttop':'Add toppings • Cubra','masala':'Tiny pinch • Pitadinha'}[kind]
    txt(x+208,y+220,caption,18)
  elif kind=='ladootray':
    rect(x+65,y+60,286,116,'#d9e9f1',22)
    for xx,yy in [(125,104),(207,104),(289,104)]: circ(x+xx,y+yy,22,'#fff4d9','#b18e67',4)
    txt(x+208,y+221,'Space apart • Deixe espaço',18)
  elif kind=='ladoofridge':
    rect(x+112,y+33,193,177,'#d6e9f4',20)
    p.append(f'<path d="M{x+112} {y+118} h193 M{x+284} {y+60} v39 M{x+284} {y+139} v41" stroke="#849cab" stroke-width="8"/>')
    for xx in (165,211,257): circ(x+xx,y+87,12,'#fff1d2','#b18e67',3)
    txt(x+208,y+243,'Chill • Leve à geladeira',19)
  else:
    p.append(f'<ellipse cx="{x+208}" cy="{y+111}" rx="140" ry="62" fill="#fff" stroke="#b6a9bc" stroke-width="5"/>')
    for xx,yy in [(145,117),(207,91),(269,117)]: circ(x+xx,y+yy,25,'#fff4dc','#b18e67',4)
    txt(x+208,y+220,'Ready • Pronto',20)
  return ''.join(p)

def make_svg(rid, spec):
  panels=[]
  manifest_panels=[]
  for idx,(en,pt,alt,adult,scene,ingredients,extra) in enumerate(spec['panels'],1):
    col=(idx-1)%3; row=(idx-1)//3; ox=col*512; oy=row*512
    bg=['#fff3e9','#eef7ff','#f2f8ed','#fff8df','#f4efff','#edf8f8'][(idx-1)%6]
    # The approved CHEF_A crop appears only in child-safe prep/serve panels; hot/raw/sharp panels use adult hands and an explicit bilingual cue.
    chef_allowed = not adult and scene not in ('raw','mixraw','applecut','applecore','airfryer','toastair','toastcheck','toastserve','panpour','pancakes','flip','thermo','allergycheck')
    if adult:
      cue=f'<rect x="{ox+214}" y="{oy+16}" width="264" height="42" rx="18" fill="#8f3434"/><text x="{ox+346}" y="{oy+45}" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="800" fill="#fff">ADULT ONLY • SÓ ADULTO</text>'
    elif rid==63 and idx==5:
      cue=f'<rect x="{ox+214}" y="{oy+16}" width="264" height="42" rx="18" fill="#336d79"/><text x="{ox+346}" y="{oy+45}" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="800" fill="#fff">HELP IF NEEDED • PEÇA AJUDA</text>'
    else:
      cue=''
    num=f'<circle cx="{ox+42}" cy="{oy+37}" r="25" fill="#594a6c"/><text x="{ox+42}" y="{oy+46}" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="800" fill="#fff">{idx}</text>'
    # source step is assigned per scene according to the unchanged source record; added cooling/allergy prompts are explicitly marked supplementary.
    source_step = 1 if rid in (27,39,40,51,63) and idx <= (1 if rid==27 else 1 if rid==39 else 1 if rid==40 else 3 if rid==51 else 2) else (2 if rid in (27,39,40,51,63) else None)
    if rid==27: source_step=1 if idx<=2 else 2 if idx<=3 else 3
    if rid==39: source_step=1 if idx==1 else 2
    if rid==40: source_step=1 if idx<=2 else 2 if idx<=4 else 3
    if rid==51: source_step=1 if idx<=3 else 2
    if rid==63: source_step=1 if idx<=2 else 2
    heading=''
    pt_accessible_note = ''
    pt_kid_instruction = pt+'.'
    if rid==39 and idx==1:
      pt_accessible_note='Lave as mãos depois de tocar no ovo cru; não prove a massa crua.'
      pt_kid_instruction='Misture a massa; lave as mãos depois de tocar no ovo cru e não prove a massa crua.'
    elif rid==39 and idx==5:
      pt_accessible_note='Mantenha a massa crua longe dos alimentos prontos para comer.'
      pt_kid_instruction='Um adulto confere se o centro está bem cozido; mantenha a massa crua longe dos alimentos prontos para comer.'
    elif rid==51 and idx==6:
      pt_accessible_note='Espere até um adulto confirmar que a torrada esfriou o suficiente para comer e peça que ele sirva.'
      pt_kid_instruction='Espere até um adulto confirmar que a torrada esfriou o suficiente para comer e peça que ele sirva.'
    # Keep the step description bilingual for screen readers and avoid repeating
    # visible cautions verbatim in the English safety note.
    extra_en = '' if rid==39 and idx in (1,5) else f' Safety: {extra}'
    desc=f'Panel {idx}, recipe {rid} {spec["title"]}. English: {alt}{(" Adult-only action." if adult else "")}{extra_en} Português: {pt}. {pt_accessible_note}'.strip()
    main=f'<g id="recipe-{rid}-panel-{idx}" aria-label="{esc(desc)}"><title>{esc(desc)}</title><rect x="{ox+8}" y="{oy+8}" width="496" height="496" rx="28" fill="{bg}" stroke="#51465f" stroke-width="4"/>{num}{heading}{cue}<text x="{ox+24}" y="{oy+93}" font-family="Arial,sans-serif" font-size="21" font-weight="800" fill="#30283a">{esc(en)}</text><text x="{ox+24}" y="{oy+120}" font-family="Arial,sans-serif" font-size="19" font-weight="700" fill="#51465f">{esc(pt)}</text><g>{scene_svg(scene,ox+35,oy+138)}</g>'
    if chef_allowed:
      main += f'<use x="{ox+395}" y="{oy+256}" width="76" height="118" href="#chef-portrait" xlink:href="#chef-portrait" aria-label="Approved Chef A portrait, consistent safe-step guide"/>'
    # two large ingredient tags max per panel: focus labels are full words, not tiny decorative icons.
    labels=[x.strip() for x in ingredients.split('•')]
    # The raw-egg hygiene/no-taste reminders on recipe 39 must be visible on the art,
    # not buried in alt text. Reserve two readable lines before the ingredient tags.
    hygiene = None
    if rid==39 and idx==1:
      hygiene=('Wash hands after egg • Lave as mãos após tocar no ovo',
               'Do not taste raw batter • Não prove a massa crua')
    elif rid==39 and idx==5:
      hygiene=('Keep raw batter away from ready food',
               'Mantenha a massa crua longe da comida pronta')
    if hygiene:
      main += f'<text x="{ox+256}" y="{oy+382}" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#8f3434">{esc(hygiene[0])}</text><text x="{ox+256}" y="{oy+401}" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#8f3434">{esc(hygiene[1])}</text>'
    chip_y=oy+(426 if hygiene else 407)
    for j,label in enumerate(labels[:3]):
      cx=ox+20+j*158; width=146
      pt_ing=PT_ING.get(label,label)
      main+=f'<rect x="{cx}" y="{chip_y}" width="{width}" height="60" rx="16" fill="#fff" stroke="#b3a8bb" stroke-width="2"/><text x="{cx+width/2}" y="{chip_y+24}" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#30283a">{esc(label)}</text><text x="{cx+width/2}" y="{chip_y+46}" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#51465f">{esc(pt_ing)}</text>'
    main+='</g>'
    panels.append(main)
    manifest_panels.append(dict(panel=idx,sourceStep=source_step,sourceStepText=spec['source_steps'][source_step-1],stepLabelEn=en,stepLabelPtBr=pt,kidInstructionEn=alt,kidInstructionPtBr=pt_kid_instruction,altText=desc,adultAssistRequired=adult,adultCueTextEn='Adult only' if adult else None,adultCueTextPtBr='Só adulto' if adult else None,conditionalHelp='Ask an adult if the refrigerator shelf is high.' if rid==63 and idx==5 else None,scene=scene,visibleIngredientLabels=labels,additionalSafetyNote=extra,reviewStatus='PENDING W07/A08 AND W08/A09 — DRAFT; NOT FOR RUNTIME'))
  title=f'Recipe {rid} {spec["title"]} — W03 remediation pilot, not approved'
  defs=f'<marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#58a4a6"/></marker><image id="chef-portrait" width="76" height="118" preserveAspectRatio="xMidYMax meet" href="{chef_data}" xlink:href="{chef_data}"/>'
  svg=f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1536" height="1024" viewBox="0 0 1536 1024" role="img" aria-labelledby="atlas-title atlas-desc"><title id="atlas-title">{esc(title)}</title><desc id="atlas-desc">Six numbered bilingual child-facing step panels; draft for independent A08/A09 review. Adult-only actions are explicitly labelled. Per-panel accessibility descriptions are attached to each group.</desc><defs>{defs}</defs>{''.join(panels)}</svg>'''
  return svg,manifest_panels

def main():
  ROOT.mkdir(parents=True,exist_ok=True)
  source_records={}
  for rid,spec in RECIPES.items():
    md=json.loads((SOURCE/spec['source_group']/'manifest.json').read_text())
    records=md.get('recipes',md.get('records',[]))
    rec=next(r for r in records if r.get('id',r.get('recipeId'))==rid)
    orig=(SOURCE/spec['source_group']/spec['file']).read_bytes()
    svg,panels=make_svg(rid,spec)
    ET.fromstring(svg.encode())
    dest=ROOT/f'recipe-{rid}-remediation-draft.svg'; dest.write_text(svg)
    source_records[str(rid)]={
      'recipeId':rid,'title':spec['title'],'sourceArchiveSha256':'30dcd8d741e9e990302342eb78fcb5bfb0154f6f26b6ff72b94cee85552fc8ab',
      'sourceDraftPath':f'{spec["source_group"]}/{spec["file"]}','sourceDraftSha256':sha(orig),
      'revisedFile':dest.name,'revisedSha256':sha(dest.read_bytes()),'catalogSha256':catalog_sha,
      'approvedChefAssetFileSha256':sha(CHEF.read_bytes()),'approvedChefWebpBytesSha256':chef_sha,'approvedChefDerivedPngSha256':chef_png_sha,'sourceSteps':spec['source_steps'],'ingredientsExact':spec['ingredients'],
      'panels':panels,'sourceReviewRisks':rec.get('knownReviewRisks',[]),
      'revisionOrigin':'W03-generated vector redraw from the unchanged recipe source text and explicit panel instructions in this isolated remediation branch; original draft SVGs were not edited in place. The approved CHEF_A portrait is included only as a static safe-step guide.',
      'adultAssistAssessment':'Recipe 63 source steps require no heat, sharp tool or raw animal-food handling, so no mandatory adult-assist cue is inferred. Refrigerator placement may need conditional adult help when the shelf is high; this remains visible in the per-panel description for panel 5.',
      'rightsTraceability':'Original ZIP recovered from Library and archive digest matches expected value; original SVG authorship/rights attestation is absent. CHEF_A input path and source-file/WebP/derived-PNG hashes are recorded, but hashes do not establish license or authorship; rights remain unresolved.',
      'decision':'DRAFT ONLY; no W07/A08 or W08/A09 approval; no runtime integration'}
  (ROOT/'pilot-manifest.json').write_text(json.dumps({'schema':'w03-remediation-pilot-v1','status':'draft-only-not-approved-not-integrated','branchBase':'a115fc00e2a516df1e819e97ec737bc55e7b2cfc','catalogSha256':catalog_sha,'archiveSha256':'30dcd8d741e9e990302342eb78fcb5bfb0154f6f26b6ff72b94cee85552fc8ab','convention':'Six numbered 3×2 panels with stable recipe-{id}-panel-{n} SVG group IDs, high-contrast scene-specific vector, bilingual short labels and safety cue, readable ingredient focus tags, consistent approved CHEF_A portrait only on child-safe non-hot panels, per-panel accessible description, no external resources. CHEF_A is embedded once in SVG defs and referenced by stable fragment IDs. Before and after PNGs are exported with Inkscape at 1536×1024 for renderer-controlled comparison.','recipes':source_records},indent=2,ensure_ascii=False)+'\n')
  ledger=[]
  for rid,rec in source_records.items():
    for p in rec['panels']:
      before_png=ROOT/'before'/f'recipe-{rid}-before.png'; after_png=ROOT/f'recipe-{rid}-after.png'
      ledger.append({'recipeId':int(rid),'panel':p['panel'],'sourceStep':p['sourceStep'],'sourceStepText':p['sourceStepText'],'beforeSvgSha256':rec['sourceDraftSha256'],'afterSvgSha256':rec['revisedSha256'],'reason':revision_reason(int(rid),p['panel']),'beforeAtlasRenderSha256':sha(before_png.read_bytes()) if before_png.exists() else None,'afterAtlasRenderSha256':sha(after_png.read_bytes()) if after_png.exists() else None,'W07_A08':'PENDING','W08_A09':'PENDING'})
  (ROOT/'panel-change-ledger.json').write_text(json.dumps(ledger,indent=2,ensure_ascii=False)+'\n')
  print(json.dumps({'pilotRecipes':list(RECIPES),'panels':len(ledger),'files':{rid:{'source':r['sourceDraftSha256'],'revised':r['revisedSha256']} for rid,r in source_records.items()},'catalogSha256':catalog_sha,'chefAssetSha256':chef_sha},indent=2))

if __name__=='__main__': main()
