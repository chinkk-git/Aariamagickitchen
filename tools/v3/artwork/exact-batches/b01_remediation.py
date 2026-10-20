#!/usr/bin/env python3
"""Deterministic B01 remediation art builder. Draft only; rights and gates remain on hold."""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import textwrap
import xml.etree.ElementTree as ET
from pathlib import Path
from xml.sax.saxutils import escape
from PIL import Image, ImageDraw, ImageFont

NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
ARCHIVE_SHA = "30dcd8d741e9e990302342eb78fcb5bfb0154f6f26b6ff72b94cee85552fc8ab"
CHARACTER_FILES = {
    "aaria": "phase2-pilot/packages/assets/characters/aaria.jpg",
    "mommy": "phase2-pilot/packages/assets/characters/mommy.jpg",
    "daddy": "phase2-pilot/packages/assets/characters/daddy.jpg",
}


def panel(action, en, pt, actor="aaria", cue="NONE", support=None):
    return {"action": action, "instructionEn": en, "instructionPtBr": pt, "actor": actor, "supportActor": support, "adultCue": cue}


# Each panel is a distinct, source-aligned micro-action. Adult-only tasks use an adult
# character and a persistent bilingual badge; supervised child tasks use ADULT HELP.
B01 = {
    11: [
        panel("wash-greens", "Wash all vegetables in clean water.", "Lave todos os vegetais em água limpa."),
        panel("cut-cucumber", "Mommy cuts the cucumber with a knife.", "A mamãe corta o pepino com uma faca.", "mommy", "ADULT ONLY"),
        panel("spread-cheese", "Spread cream cheese across the tortilla.", "Espalhe cream cheese por toda a tortilha."),
        panel("add-lettuce", "Add lettuce in one thin layer.", "Coloque uma camada fina de alface."),
        panel("add-carrot-cucumber", "Add grated carrot and pre-cut cucumber.", "Acrescente cenoura ralada e pepino já cortado."),
        panel("roll-pinwheels", "Roll tightly. Daddy cuts the pinwheels.", "Enrole bem. O papai corta os rolinhos.", "daddy", "ADULT ONLY"),
    ],
    12: [
        panel("crack-egg", "Mommy cracks the egg; wash hands after raw egg.", "A mamãe quebra o ovo; lave as mãos após tocar no ovo cru.", "mommy", "ADULT ONLY"),
        panel("mix-batter", "Mix in corn, flour, cheese and milk; do not taste raw batter.", "Misture milho, farinha, queijo e leite; não prove a massa crua.", "aaria", "ADULT HELP", "mommy"),
        panel("warm-pan", "Mommy warms the oiled pan on low heat.", "A mamãe aquece a frigideira untada em fogo baixo.", "mommy", "ADULT ONLY"),
        panel("spoon-batter", "Mommy spoons small pancakes into the pan.", "A mamãe coloca pequenas porções de massa na frigideira.", "mommy", "ADULT ONLY"),
        panel("flip-pancake", "Mommy flips each pancake after 2–3 minutes.", "A mamãe vira cada panqueca após 2–3 minutos.", "mommy", "ADULT ONLY"),
        panel("check-cool-pancake", "Mommy checks the centre is cooked, then cools the pancakes.", "A mamãe confere se o centro está cozido e deixa as panquecas esfriarem.", "mommy", "ADULT ONLY"),
    ],
    13: [
        panel("set-bread", "Place one slice of bread on a plate.", "Coloque uma fatia de pão em um prato."),
        panel("lay-cheese", "Lay the cheese flat on the bread.", "Coloque o queijo sobre o pão."),
        panel("toast-bread", "Mommy puts the bread in the toaster oven.", "A mamãe coloca o pão no forno elétrico.", "mommy", "ADULT ONLY"),
        panel("remove-toast", "Mommy removes the hot toast and sets it aside to cool.", "A mamãe retira a torrada quente e a deixa esfriar.", "mommy", "ADULT ONLY"),
        panel("prep-bear-toppings", "Daddy cuts cucumber ears and tomato noses safely.", "O papai corta o pepino para as orelhas e o tomate para o nariz.", "daddy", "ADULT ONLY"),
        panel("decorate-toast", "When fully cool, add the pre-cut cucumber and tomato.", "Quando estiver fria, coloque o pepino e o tomate já cortados.", "aaria", "ADULT HELP", "mommy"),
    ],
    14: [
        panel("set-bagels", "Place the pre-sliced bagel halves on a tray.", "Coloque as metades de bagel já cortadas em uma bandeja."),
        panel("spread-sauce", "Spread sauce over each bagel half.", "Espalhe molho sobre cada metade de bagel."),
        panel("add-corn", "With a grown-up, sprinkle corn over the sauce.", "Com um adulto, espalhe milho sobre o molho.", "aaria", "ADULT HELP", "mommy"),
        panel("add-pepper-cheese", "Add peppers cut by a grown-up and cheese.", "Acrescente o pimentão já cortado por um adulto e o queijo.", "aaria", "ADULT HELP", "mommy"),
        panel("load-air-fryer", "Mommy places the bagels in the air fryer.", "A mamãe coloca os bagels na air fryer.", "mommy", "ADULT ONLY"),
        panel("remove-air-fryer", "Mommy removes the hot basket; wait while the bagels cool.", "A mamãe retira o cesto quente; espere os bagels esfriarem.", "mommy", "ADULT ONLY"),
    ],
    15: [
        panel("cut-zucchini", "Daddy cuts the zucchini into sticks.", "O papai corta a abobrinha em palitos.", "daddy", "ADULT ONLY"),
        panel("arrange-zucchini", "Arrange the pre-cut sticks on a clean tray.", "Organize os palitos já cortados em uma bandeja limpa."),
        panel("prepare-egg-crumbs", "Mommy beats the egg and sets out crumbs; wash hands after raw egg.", "A mamãe bate o ovo e separa a farinha de rosca; lave as mãos após tocar no ovo cru.", "mommy", "ADULT ONLY"),
        panel("coat-zucchini", "With Mommy, use a fork to coat each stick; wash hands after raw egg.", "Com a mamãe, use um garfo para empanar; lave as mãos após tocar no ovo cru.", "aaria", "ADULT HELP", "mommy"),
        panel("load-air-fryer-fries", "Daddy places the coated sticks in one layer in the air fryer.", "O papai coloca os palitos empanados em uma camada na air fryer.", "daddy", "ADULT ONLY"),
        panel("check-cool-fries", "Daddy checks they are tender, removes them and lets them cool.", "O papai confere se estão macios, retira e deixa esfriar.", "daddy", "ADULT ONLY"),
    ],
}


# Recipe-specific, visibly different food actions. Characters remain the repository's
# existing character illustrations; the source artwork itself is copied unchanged.
SCENES = {
    "wash-greens": '<path d="M38 248h250v35H38z" fill="#c9eff5" stroke="#526473" stroke-width="5"/><path d="M62 248v-45h82q25 0 25 25v20" fill="none" stroke="#657989" stroke-width="9"/><path d="M67 163q-22 20-5 43 22 8 32-18m14-28q-22 28 1 47 26-4 25-33" fill="#77be71" stroke="#3e7952" stroke-width="5"/><path d="M135 178l30 38 37-42" fill="none" stroke="#54a665" stroke-width="12" stroke-linecap="round"/><path d="M208 160l63 10-35 47-31-33Z" fill="#f28d39" stroke="#a85f35" stroke-width="5"/><path d="M223 151l8-12m24 15 13-9" stroke="#67aa62" stroke-width="5"/><path d="M193 106v22m24-12-10 17m-28-9 5 14" stroke="#57bad1" stroke-width="7" stroke-linecap="round"/>',
    "cut-cucumber": '<rect x="31" y="231" width="270" height="48" rx="9" fill="#cfa87b" stroke="#73583b" stroke-width="5"/><path d="M65 205q32-78 142-39l-28 35-93 20Z" fill="#65b66b" stroke="#356a46" stroke-width="6"/><path d="M103 193q29-35 73-20l-14 18-48 14Z" fill="#d7edaf"/><path d="M169 131l74 55-21 22-76-56Z" fill="#dce7ee" stroke="#58677b" stroke-width="6"/><path d="M210 134l37-29 18 18-26 41Z" fill="#8769a0" stroke="#58677b" stroke-width="6"/>',
    "spread-cheese": '<ellipse cx="160" cy="215" rx="128" ry="72" fill="#f3d898" stroke="#9b7444" stroke-width="6"/><ellipse cx="160" cy="205" rx="106" ry="54" fill="#fff8e7" stroke="#c7a972" stroke-width="4"/><path d="M76 192q54-40 126 2" fill="none" stroke="#f4e2ad" stroke-width="18"/><path d="M202 143l70 43-16 19-69-44Z" fill="#d8b77b" stroke="#755a3c" stroke-width="5"/>',
    "add-lettuce": '<ellipse cx="160" cy="218" rx="128" ry="70" fill="#f3d898" stroke="#9b7444" stroke-width="6"/><path d="M70 217q7-85 50-39 29-67 57-1 31-60 60 8 19 52-18 62H94q-30-4-24-30Z" fill="#67b85f" stroke="#3d8148" stroke-width="5"/><path d="M64 134v38m-12-11 12 13 12-13" stroke="#6850a0" stroke-width="7" fill="none" stroke-linecap="round"/>',
    "add-carrot-cucumber": '<ellipse cx="160" cy="218" rx="128" ry="70" fill="#f3d898" stroke="#9b7444" stroke-width="6"/><path d="M62 205l160-34m-147 63 149-32m-126-47 116 57" stroke="#ef8b32" stroke-width="9" stroke-linecap="round"/><g fill="#62ad70" stroke="#fff" stroke-width="4"><circle cx="98" cy="209" r="19"/><circle cx="151" cy="232" r="18"/><circle cx="207" cy="198" r="19"/></g><g fill="#d5edb6"><circle cx="98" cy="209" r="8"/><circle cx="151" cy="232" r="8"/><circle cx="207" cy="198" r="8"/></g>',
    "roll-pinwheels": '<path d="M46 184q108-62 220 0v54q-109 60-220 0Z" fill="#f5d88f" stroke="#94693c" stroke-width="6"/><ellipse cx="85" cy="211" rx="27" ry="35" fill="#fff2d0" stroke="#8d6745" stroke-width="5"/><path d="M75 205q10-18 21 0 12 17-9 25-23-8-12-25Z" fill="#63ae61"/><path d="M226 145l46 56-18 19-49-57Z" fill="#dce7ee" stroke="#536273" stroke-width="5"/><path d="M255 145l29-27 16 17-23 37Z" fill="#866aa0"/>',
    "crack-egg": '<ellipse cx="157" cy="252" rx="112" ry="31" fill="#dee8ee" stroke="#627180" stroke-width="5"/><path d="M129 133q-50 51-15 87 42 16 74-6 29-35-16-82-22-22-43 1Z" fill="#fffaf0" stroke="#998b72" stroke-width="5"/><ellipse cx="156" cy="212" rx="32" ry="22" fill="#f2b83f"/><path d="M95 148l28 31m91-31-29 31" stroke="#9a875d" stroke-width="8"/><path d="M214 126l27-15m-9 28 24-2" stroke="#c85b52" stroke-width="5"/>',
    "mix-batter": '<path d="M51 165h220l-28 105q-81 41-164 0Z" fill="#dceaf0" stroke="#64798a" stroke-width="6"/><ellipse cx="161" cy="166" rx="110" ry="30" fill="#fffaf1" stroke="#64798a" stroke-width="6"/><path d="M111 139l80 73m8-72-85 83" stroke="#8885a6" stroke-width="6"/><circle cx="92" cy="151" r="12" fill="#f4c84d"/><circle cx="227" cy="157" r="11" fill="#f4c84d"/><path d="M64 118l14 21m183-26-13 21" stroke="#f49a37" stroke-width="9"/>',
    "warm-pan": '<path d="M66 217h185l-18 48H82Z" fill="#41474d" stroke="#24282b" stroke-width="6"/><ellipse cx="158" cy="213" rx="95" ry="18" fill="#626b73"/><path d="M248 224h51v15h-52" fill="#5b6570"/><path d="M103 181q-14-23 0-44m49 44q-14-23 0-44m49 44q-14-23 0-44" fill="none" stroke="#e86d44" stroke-width="7" stroke-linecap="round"/><path d="M91 278h157" stroke="#c2a37a" stroke-width="8"/>',
    "spoon-batter": '<path d="M72 227h185l-18 45H88Z" fill="#41474d" stroke="#24282b" stroke-width="6"/><ellipse cx="159" cy="222" rx="94" ry="17" fill="#626b73"/><path d="M248 232h51v14h-51" fill="#5b6570"/><ellipse cx="113" cy="213" rx="22" ry="10" fill="#f0c55d"/><ellipse cx="170" cy="213" rx="22" ry="10" fill="#f0c55d"/><ellipse cx="220" cy="213" rx="20" ry="10" fill="#f0c55d"/><path d="M167 125l20 68" stroke="#7b6a50" stroke-width="10"/><ellipse cx="164" cy="122" rx="17" ry="10" fill="#b88a4a"/>',
    "flip-pancake": '<path d="M72 227h185l-18 45H88Z" fill="#41474d" stroke="#24282b" stroke-width="6"/><ellipse cx="163" cy="218" rx="50" ry="20" fill="#d89b4b" stroke="#8a5629" stroke-width="5"/><path d="M157 139l92 58-13 16-92-58Z" fill="#c8d4da" stroke="#64798a" stroke-width="5"/><path d="M119 143q-22-27 0-44m55 40q-22-27 0-44" stroke="#e97c45" stroke-width="7" fill="none"/>',
    "check-cool-pancake": '<ellipse cx="159" cy="240" rx="116" ry="34" fill="#dce8ee" stroke="#65717c" stroke-width="6"/><ellipse cx="159" cy="224" rx="68" ry="26" fill="#d99a4b" stroke="#a36b35" stroke-width="5"/><circle cx="160" cy="224" r="11" fill="#f3d16a"/><path d="M75 138q-17-22 0-42m50 42q-17-22 0-42" stroke="#75b9d0" stroke-width="7" fill="none"/>',
    "set-bread": '<rect x="81" y="146" width="169" height="124" rx="35" fill="#e6ad5e" stroke="#a06d34" stroke-width="6"/><rect x="102" y="166" width="126" height="84" rx="24" fill="#ffe4a4"/><path d="M55 280h222" stroke="#a18b76" stroke-width="8"/>',
    "lay-cheese": '<rect x="80" y="147" width="170" height="123" rx="34" fill="#e6ad5e" stroke="#a06d34" stroke-width="6"/><rect x="102" y="165" width="127" height="86" rx="13" fill="#ffd858" stroke="#d8a83d" stroke-width="4"/><path d="M57 281h219" stroke="#a18b76" stroke-width="8"/>',
    "toast-bread": '<rect x="45" y="151" width="257" height="126" rx="18" fill="#58636e" stroke="#313a42" stroke-width="7"/><rect x="77" y="174" width="193" height="76" rx="10" fill="#8cb2bd" stroke="#303940" stroke-width="5"/><rect x="131" y="190" width="83" height="50" rx="17" fill="#e6ad5e"/><rect x="150" y="199" width="48" height="31" rx="8" fill="#ffd858"/><circle cx="70" cy="263" r="8" fill="#db564d"/>',
    "remove-toast": '<path d="M50 257h239" stroke="#a18b76" stroke-width="9"/><rect x="81" y="182" width="151" height="78" rx="19" fill="#e6ad5e"/><rect x="103" y="195" width="108" height="49" rx="9" fill="#ffd858"/><path d="M91 159l42 39m-20-51 39 39" stroke="#876c54" stroke-width="11"/><path d="M56 141q-16-20 0-38m56 38q-16-20 0-38" stroke="#70b8cc" stroke-width="7" fill="none"/>',
    "prep-bear-toppings": '<rect x="42" y="231" width="254" height="43" rx="8" fill="#cfa87b" stroke="#73583b" stroke-width="5"/><path d="M95 191q25-46 54-8l-19 37-35-11Zm105-5q25-44 52-4l-18 37-35-11Z" fill="#63ad70" stroke="#3c8148" stroke-width="4"/><path d="M184 112l66 61-19 19-64-62Z" fill="#dce7ee" stroke="#58677b" stroke-width="5"/><path d="M239 116l32-25 16 17-23 35Z" fill="#886aa0"/>',
    "decorate-toast": '<rect x="60" y="169" width="202" height="121" rx="34" fill="#e6ad5e" stroke="#a06d34" stroke-width="6"/><rect x="83" y="186" width="156" height="84" rx="18" fill="#ffd858"/><circle cx="142" cy="219" r="10" fill="#4d7550"/><circle cx="195" cy="219" r="10" fill="#4d7550"/><ellipse cx="168" cy="245" rx="18" ry="11" fill="#d9584c"/><path d="M90 193q-37-41-16-52 30 1 36 45m96 8q31-38 45-19 3 27-34 40" fill="#5eab6b" stroke="#3e7f49" stroke-width="5"/>',
    "set-bagels": '<ellipse cx="112" cy="220" rx="63" ry="56" fill="#d69a51" stroke="#94602f" stroke-width="6"/><ellipse cx="112" cy="220" rx="21" ry="18" fill="#fff5dc" stroke="#94602f" stroke-width="5"/><ellipse cx="227" cy="220" rx="63" ry="56" fill="#d69a51" stroke="#94602f" stroke-width="6"/><ellipse cx="227" cy="220" rx="21" ry="18" fill="#fff5dc" stroke="#94602f" stroke-width="5"/><path d="M54 286h235" stroke="#a18b76" stroke-width="8"/>',
    "spread-sauce": '<ellipse cx="112" cy="220" rx="63" ry="56" fill="#d69a51" stroke="#94602f" stroke-width="6"/><ellipse cx="112" cy="220" rx="21" ry="18" fill="#fff5dc"/><ellipse cx="227" cy="220" rx="63" ry="56" fill="#d69a51" stroke="#94602f" stroke-width="6"/><ellipse cx="227" cy="220" rx="21" ry="18" fill="#fff5dc"/><path d="M70 211q41-34 84 0m31 0q41-34 84 0" stroke="#ce5547" stroke-width="13" fill="none" stroke-linecap="round"/>',
    "add-corn": '<ellipse cx="112" cy="220" rx="63" ry="56" fill="#d69a51" stroke="#94602f" stroke-width="6"/><ellipse cx="227" cy="220" rx="63" ry="56" fill="#d69a51" stroke="#94602f" stroke-width="6"/><path d="M80 210h62m-48-22 47 45m54-22h64m-48-23 46 45" stroke="#f3ce54" stroke-width="13" stroke-linecap="round"/><path d="M162 126l34 66" stroke="#8a6b4c" stroke-width="10"/><circle cx="161" cy="123" r="15" fill="#f3ce54"/>',
    "add-pepper-cheese": '<ellipse cx="112" cy="220" rx="63" ry="56" fill="#d69a51" stroke="#94602f" stroke-width="6"/><ellipse cx="227" cy="220" rx="63" ry="56" fill="#d69a51" stroke="#94602f" stroke-width="6"/><path d="M81 200q32-32 61-2m49 4q27-30 57-3" stroke="#5fa861" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M83 236l52-28m62 30 53-27" stroke="#f7d75f" stroke-width="10"/><circle cx="111" cy="226" r="8" fill="#efb835"/><circle cx="225" cy="226" r="8" fill="#efb835"/>',
    "load-air-fryer": '<rect x="59" y="138" width="210" height="146" rx="22" fill="#59636e" stroke="#303942" stroke-width="7"/><rect x="90" y="169" width="148" height="72" rx="9" fill="#27323c"/><path d="M108 207h114" stroke="#b3c4cd" stroke-width="4"/><circle cx="113" cy="155" r="7" fill="#e7c45b"/><circle cx="140" cy="155" r="7" fill="#dc6555"/><path d="M66 264h-26" stroke="#49545f" stroke-width="12"/>',
    "remove-air-fryer": '<rect x="61" y="143" width="195" height="132" rx="19" fill="#59636e" stroke="#303942" stroke-width="7"/><rect x="89" y="170" width="145" height="62" rx="8" fill="#27323c"/><path d="M111 153q-15-22 0-40m51 40q-15-22 0-40m50 40q-15-22 0-40" stroke="#e7864a" stroke-width="7" fill="none"/><path d="M70 290h228" stroke="#a18b76" stroke-width="9"/>',
    "cut-zucchini": '<rect x="34" y="235" width="269" height="43" rx="8" fill="#cfa87b" stroke="#73583b" stroke-width="5"/><path d="M63 211q23-68 145-54l-19 44-109 26Z" fill="#58a963" stroke="#347345" stroke-width="6"/><path d="M174 134l74 60-17 21-78-61Z" fill="#dce7ee" stroke="#58677b" stroke-width="5"/><path d="M224 132l40-28 15 19-31 40Z" fill="#866aa0"/>',
    "arrange-zucchini": '<rect x="46" y="191" width="253" height="86" rx="14" fill="#e8e0d4" stroke="#947c62" stroke-width="5"/><path d="M70 217l155-22m-142 48 157-23m-70-16 67 29" stroke="#57a867" stroke-width="15" stroke-linecap="round"/><path d="M251 146v49m-17-18 17 18 17-18" stroke="#6b58a0" stroke-width="7" fill="none" stroke-linecap="round"/>',
    "prepare-egg-crumbs": '<ellipse cx="91" cy="232" rx="59" ry="35" fill="#fff7df" stroke="#9d835e" stroke-width="5"/><ellipse cx="224" cy="232" rx="59" ry="35" fill="#dcb47c" stroke="#9d835e" stroke-width="5"/><path d="M83 152q-40 42-12 66 26 8 48-5 20-26-14-63-13-12-22 2Z" fill="#fffaf0" stroke="#998b72" stroke-width="4"/><ellipse cx="96" cy="209" rx="19" ry="13" fill="#f2b83f"/><circle cx="210" cy="222" r="7" fill="#f4e4c8"/><circle cx="234" cy="237" r="8" fill="#f4e4c8"/><circle cx="250" cy="214" r="7" fill="#f4e4c8"/><path d="M64 131l23 24" stroke="#8b694e" stroke-width="8"/>',
    "coat-zucchini": '<ellipse cx="96" cy="230" rx="57" ry="34" fill="#fff7df" stroke="#9d835e" stroke-width="5"/><ellipse cx="224" cy="230" rx="57" ry="34" fill="#dcb47c" stroke="#9d835e" stroke-width="5"/><path d="M70 207l51 44m-54-7 55-49" stroke="#68829a" stroke-width="6"/><path d="M162 165l65 34-21 34-65-34Z" fill="#62ad68" stroke="#347345" stroke-width="5"/><path d="M66 144q-16-24 0-43m48 43q-16-24 0-43" stroke="#71b6ca" stroke-width="7" fill="none"/>',
    "load-air-fryer-fries": '<rect x="58" y="138" width="210" height="145" rx="20" fill="#59636e" stroke="#303942" stroke-width="7"/><rect x="89" y="168" width="149" height="74" rx="8" fill="#27323c"/><path d="M107 190l30 8m4 20 30-8m6-22 31 8" stroke="#d9c28f" stroke-width="10" stroke-linecap="round"/><circle cx="112" cy="154" r="7" fill="#e7c45b"/><circle cx="140" cy="154" r="7" fill="#dc6555"/>',
    "check-cool-fries": '<ellipse cx="158" cy="244" rx="120" ry="34" fill="#dce8ee" stroke="#65717c" stroke-width="6"/><path d="M90 232l70-27m-38 39 72-30m-16 38 46-18" stroke="#d9b06a" stroke-width="14" stroke-linecap="round"/><path d="M66 155q-16-21 0-40m47 40q-16-21 0-40" stroke="#71b6ca" stroke-width="7" fill="none"/>',
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def tspan_lines(text: str, x: int, y: int, width: int, size: int, color: str, language: str, max_lines: int = 2) -> str:
    lines = textwrap.wrap(text, width=width, break_long_words=False, break_on_hyphens=False) or [text]
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(".,;: ") + "…"
    tspans = "".join(f'<tspan x="{x}" dy="{size+3}">{escape(line)}</tspan>' for line in lines)
    return f'<text xml:lang="{language}" x="{x}" y="{y}" font-family="Arial,sans-serif" font-size="{size}" fill="{color}">{tspans}</text>'


def panel_svg(recipe_id: int, title: str, index: int, spec: dict) -> str:
    bg = ["#fff6e8", "#eff8f2", "#f3efff", "#fff1ef", "#edf7fb", "#faf2e9"][(recipe_id + index) % 6]
    cue = spec["adultCue"]
    cue_text = "ADULT ONLY / SÓ ADULTO" if cue == "ADULT ONLY" else "ADULT HELP / AJUDA"
    badge = ""
    if cue != "NONE":
        badge = f'<rect x="300" y="24" width="188" height="34" rx="16" fill="#8c3535"/><text x="394" y="46" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="800" fill="#fff">{cue_text}</text>'
    character = spec["actor"]
    character_label = {"aaria": "Aaria", "mommy": "Mommy", "daddy": "Daddy"}[character]
    support = spec.get("supportActor")
    if support:
        char_views = f'''<image href="../characters/{character}.jpg" xlink:href="../characters/{character}.jpg" x="326" y="102" width="78" height="166" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-r{recipe_id}-p{index}-main)" aria-label="Original project character: {character_label}"/><rect x="326" y="102" width="78" height="166" rx="18" fill="none" stroke="#675475" stroke-width="3"/><image href="../characters/{support}.jpg" xlink:href="../characters/{support}.jpg" x="410" y="102" width="78" height="166" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-r{recipe_id}-p{index}-support)" aria-label="Adult helper: {support}"/><rect x="410" y="102" width="78" height="166" rx="18" fill="none" stroke="#675475" stroke-width="3"/><text x="365" y="291" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#46364d">{character_label}</text><text x="449" y="291" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#46364d">{support.title()}</text>'''
        clip_defs = f'''<clipPath id="avatar-r{recipe_id}-p{index}-main"><rect x="326" y="102" width="78" height="166" rx="18"/></clipPath><clipPath id="avatar-r{recipe_id}-p{index}-support"><rect x="410" y="102" width="78" height="166" rx="18"/></clipPath>'''
    else:
        char_views = f'''<image href="../characters/{character}.jpg" xlink:href="../characters/{character}.jpg" x="326" y="102" width="162" height="184" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-r{recipe_id}-p{index})" aria-label="Original project character: {character_label}"/><rect x="326" y="102" width="162" height="184" rx="24" fill="none" stroke="#675475" stroke-width="4"/><text x="407" y="309" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#46364d">{character_label}</text>'''
        clip_defs = f'''<clipPath id="avatar-r{recipe_id}-p{index}"><rect x="326" y="102" width="162" height="184" rx="24"/></clipPath>'''
    scene = SCENES[spec["action"]]
    en = tspan_lines(spec["instructionEn"], 28, 365, 51, 17, "#30283a", "en-GB")
    pt = tspan_lines(spec["instructionPtBr"], 28, 430, 51, 17, "#30283a", "pt-BR")
    return f'''<g id="panel-{index}" data-action="{spec['action']}" data-adult-cue="{cue}" role="group" aria-labelledby="r{recipe_id}-p{index}-title r{recipe_id}-p{index}-desc-en r{recipe_id}-p{index}-desc-pt">
<title id="r{recipe_id}-p{index}-title">Recipe {recipe_id}, step {index} of 6 / Passo {index} de 6</title>
<desc id="r{recipe_id}-p{index}-desc-en" xml:lang="en-GB">{escape(spec['instructionEn'])}</desc><desc id="r{recipe_id}-p{index}-desc-pt" xml:lang="pt-BR">{escape(spec['instructionPtBr'])}. {escape(cue_text if cue != 'NONE' else 'Child task / tarefa da criança')}.</desc>
<rect x="8" y="8" width="496" height="496" rx="28" fill="{bg}" stroke="#d8cadf" stroke-width="4"/>
<text x="28" y="48" font-family="Arial,sans-serif" font-size="18" font-weight="800" fill="#45334d">STEP {index} / 6 • PASSO {index} / 6</text>{badge}
<g aria-label="Step-specific food action">{scene}</g>
<defs>{clip_defs}</defs>{char_views}
<rect x="18" y="333" width="476" height="155" rx="20" fill="#fff" stroke="#dfd3e4" stroke-width="2"/>
<text x="28" y="354" font-family="Arial,sans-serif" font-size="12" font-weight="800" fill="#66556b">ENGLISH</text>{en}
<text x="28" y="420" font-family="Arial,sans-serif" font-size="12" font-weight="800" fill="#66556b">PORTUGUÊS (BR)</text>{pt}
</g>'''


def write_b01(repo: Path, out: Path, records: dict[int, dict], source_paths: dict[int, Path], render) -> None:
    shutil.rmtree(out, ignore_errors=True)
    for folder in ("atlases", "sources", "previews/svg", "previews/png", "characters"):
        (out / folder).mkdir(parents=True, exist_ok=True)

    char_manifest = {}
    for name, relative in CHARACTER_FILES.items():
        src = repo / relative
        if not src.is_file():
            raise SystemExit(f"Required original character asset is missing: {relative}")
        data = src.read_bytes()
        dest = out / "characters" / f"{name}.jpg"
        dest.write_bytes(data)
        char_manifest[name] = {"sourcePath": relative, "packagePath": f"characters/{name}.jpg", "sha256": digest(data), "rightsStatus": "UNRESOLVED; retained for project review only"}

    recipes = []
    for rid, specs in B01.items():
        if rid not in records or rid not in source_paths:
            raise SystemExit(f"Missing preserved source artwork for recipe {rid}")
        record, source_svg = records[rid], source_paths[rid]
        source_bytes = source_svg.read_bytes()
        if digest(source_bytes) != record["sourceSha256"]:
            raise SystemExit(f"Original source-art hash mismatch for recipe {rid}")
        prior_atlas = Path(record["_atlasPath"])
        prior_bytes = prior_atlas.read_bytes()
        if digest(prior_bytes) != record["outputSha256"]:
            raise SystemExit(f"Preserved prior-draft hash mismatch for recipe {rid}")
        source_copy = out / "sources" / f"recipe-{rid:02d}-source.svg"
        prior_copy = out / "sources" / f"recipe-{rid:02d}-prior-draft.svg"
        source_copy.write_bytes(source_bytes)
        prior_copy.write_bytes(prior_bytes)

        atlas_path = out / "atlases" / f"recipe-{rid:02d}-remediation-draft.svg"
        atlas_body = []
        panel_records = []
        for index, spec in enumerate(specs, 1):
            col, row = (index - 1) % 3, (index - 1) // 3
            atlas_body.append(f'<g transform="translate({col*512} {row*512})">{panel_svg(rid, record["title"], index, spec)}</g>')
            old_panel = record["panels"][index - 1]
            panel_records.append({
                "panel": index,
                "sourceStep": old_panel["sourceStep"],
                "sourceStepText": old_panel["sourceStepText"],
                "actionKey": spec["action"],
                "adultCue": spec["adultCue"],
                "adultOnlyCue": spec["adultCue"] == "ADULT ONLY",
                "actor": spec["actor"],
                "supportActor": spec.get("supportActor"),
                "instructionEn": spec["instructionEn"],
                "instructionPtBr": spec["instructionPtBr"],
                "previewSvg": f"previews/svg/recipe-{rid:02d}-panel-{index:02d}.svg",
                "previewPng": f"previews/png/recipe-{rid:02d}-panel-{index:02d}.png",
            })

        atlas_text = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="{NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="1536" height="1024" viewBox="0 0 1536 1024" role="img" aria-labelledby="title-{rid} desc-{rid}" data-review-status="draft-only-not-approved">
<title id="title-{rid}">Recipe {rid}: {escape(record['title'])} — bilingual six-step remediation draft</title>
<desc id="desc-{rid}">Remediation draft with original project character assets and English/Português-BR instructions. Rights, A08 safety and A09 experience review remain pending.</desc>
<metadata>Source archive SHA-256: {ARCHIVE_SHA}; source SVG: {escape(record['sourcePath'])}; source SVG SHA-256: {record['sourceSha256']}; prior draft SHA-256: {record['outputSha256']}; artwork rights unresolved.</metadata>
<rect width="1536" height="1024" fill="#fffaf3"/>{''.join(atlas_body)}</svg>'''
        atlas_path.write_text(atlas_text, encoding="utf-8")
        for p, spec in zip(panel_records, specs):
            svg_path = out / p["previewSvg"]
            png_path = out / p["previewPng"]
            col, row = (p["panel"] - 1) % 3, (p["panel"] - 1) // 3
            contents = panel_svg(rid, record["title"], p["panel"], spec).replace("../characters/", "../../characters/")
            svg_path.write_text(
                f'''<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="{NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="Recipe {rid}, step {p['panel']} of 6 / Passo {p['panel']} de 6">{contents}</svg>''',
                encoding="utf-8",
            )
            render(svg_path, png_path, 480, 480)
            p["previewSvgSha256"] = digest(svg_path.read_bytes())
            p["previewPngSha256"] = digest(png_path.read_bytes())
            p["atlasSha256"] = digest(atlas_path.read_bytes())
        recipes.append({
            "id": rid, "title": record["title"],
            "sourceArtwork": {"path": record["sourcePath"], "sha256": record["sourceSha256"], "preservedCopy": str(source_copy.relative_to(out))},
            "priorDraft": {"path": str(prior_atlas.relative_to(repo)), "sha256": record["outputSha256"], "preservedCopy": str(prior_copy.relative_to(out))},
            "remediationAtlas": {"path": str(atlas_path.relative_to(out)), "sha256": digest(atlas_path.read_bytes()), "dimensions": "1536x1024"},
            "panels": panel_records,
        })

    # Contact sheet references the rendered, hash-recorded 480x480 panels.
    width, cell_w, cell_h, header_h = 1440, 240, 300, 64
    sheet = ET.Element(f"{{{NS}}}svg", {"width": str(width), "height": "1564", "viewBox": "0 0 1440 1564", "role": "img", "aria-label": "B01 bilingual remediation draft contact sheet"})
    ET.SubElement(sheet, f"{{{NS}}}rect", {"width": "1440", "height": "1564", "fill": "#f8f1fb"})
    heading = ET.SubElement(sheet, f"{{{NS}}}text", {"x": "24", "y": "42", "font-family": "Arial,sans-serif", "font-size": "27", "font-weight": "700", "fill": "#342344"})
    heading.text = "B01 • Recipes 11–15 • Remediation draft • A08/A09 and rights HOLD"
    ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")
    for ri, recipe in enumerate(recipes):
        for p in recipe["panels"]:
            linear = ri * 6 + p["panel"] - 1
            col, row = linear % 6, linear // 6
            x, y = col*cell_w, header_h+row*cell_h
            ET.SubElement(sheet, f"{{{NS}}}rect", {"x": str(x+4), "y": str(y+4), "width": str(cell_w-8), "height": str(cell_h-8), "rx": "12", "fill": "#fff", "stroke": "#dfcfe8", "stroke-width": "2"})
            image = ET.SubElement(sheet, f"{{{NS}}}image", {"x": str(x+20), "y": str(y+12), "width": "200", "height": "200", "preserveAspectRatio": "xMidYMid meet", "href": p["previewPng"]})
            image.set("{http://www.w3.org/1999/xlink}href", p["previewPng"])
            label = ET.SubElement(sheet, f"{{{NS}}}text", {"x": str(x+120), "y": str(y+237), "text-anchor": "middle", "font-family": "Arial,sans-serif", "font-size": "12", "font-weight": "700", "fill": "#342344"})
            label.text = f"Recipe {recipe['id']} • Step {p['panel']}"
            if p["adultCue"] != "NONE":
                cue = ET.SubElement(sheet, f"{{{NS}}}text", {"x": str(x+120), "y": str(y+258), "text-anchor": "middle", "font-family": "Arial,sans-serif", "font-size": "10", "font-weight": "700", "fill": "#8f3434"})
                cue.text = p["adultCue"]
    sheet_svg = out / "contact-sheet.svg"
    sheet_svg.write_bytes(ET.tostring(sheet, encoding="utf-8", xml_declaration=True))
    # Rasterize the sheet with Pillow instead of relying on SVG viewers' handling of
    # many linked local images (which can silently omit panels in some renderers).
    canvas = Image.new("RGB", (1440, 1564), "#f8f1fb")
    draw = ImageDraw.Draw(canvas)
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 27)
        font_label = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        font_cue = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except OSError:
        font_title, font_label, font_cue = ImageFont.load_default(), ImageFont.load_default(), ImageFont.load_default()
    draw.text((24, 16), "B01 • Recipes 11–15 • Remediation draft • A08/A09 and rights HOLD", font=font_title, fill="#342344")
    for ri, recipe in enumerate(recipes):
        for p in recipe["panels"]:
            linear = ri * 6 + p["panel"] - 1
            col, row = linear % 6, linear // 6
            x, y = col*cell_w, header_h+row*cell_h
            draw.rounded_rectangle((x+4, y+4, x+cell_w-4, y+cell_h-4), radius=12, fill="#ffffff", outline="#dfcfe8", width=2)
            with Image.open(out / p["previewPng"]) as source:
                thumbnail = source.convert("RGB").resize((200, 200), Image.Resampling.LANCZOS)
                canvas.paste(thumbnail, (x+20, y+12))
            label = f"Recipe {recipe['id']} • Step {p['panel']}"
            draw.text((x+cell_w//2, y+235), label, font=font_label, fill="#342344", anchor="mt")
            if p["adultCue"] != "NONE":
                draw.text((x+cell_w//2, y+256), p["adultCue"], font=font_cue, fill="#8f3434", anchor="mt")
    canvas.save(out / "contact-sheet.png", format="PNG", optimize=True)

    review_source = repo / "tools/v3/artwork/exact-batches/review-records"
    for report in ("B01-A08-review.md", "B01-A09-review.md"):
        source_report = review_source / report
        if source_report.is_file():
            shutil.copyfile(source_report, out / report.replace("B01-", ""))

    review_path = out / "review-evidence.json"
    review = json.loads((out / "review-evidence.json").read_text()) if review_path.is_file() else {}
    review.update({
        "batch": "B01",
        "previousReview": {"A08": "CHANGES_REQUESTED", "A09": "CHANGES_REQUESTED", "artifactId": 12302803813},
        "remediationStatus": "IMPLEMENTED_AWAITING_INDEPENDENT_REREVIEW",
        "formalGateApproval": {"A08": False, "A09": False},
        "artworkRights": {"status": "UNRESOLVED", "clearanceClaimed": False},
        "note": "Automated generation and CI do not approve child safety, child experience, or artwork rights."
    })
    review_path.write_text(json.dumps(review, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")

    ledger = {
        "batch": "B01", "status": "REMEDIATED_PENDING_INDEPENDENT_REREVIEW", "sourceReviewArtifactId": 12302803813,
        "sourceArchiveSha256": ARCHIVE_SHA,
        "findings": [
            {"reviewer": "A08", "severity": "high", "finding": "R15 p5–6 both air-fryer scenes; one lacked adult cue. R15 p3–4 raw egg/crumb handling cues differed.", "remediation": "R15 panels 5 and 6 are distinct air-fryer load/check-and-cool scenes, both ADULT ONLY. Panel 3 adult prepares raw egg/crumb station; panel 4 uses fork with adult beside child; both cues explicitly recorded.", "panels": ["R15-P03", "R15-P04", "R15-P05", "R15-P06"], "status": "IMPLEMENTED_PENDING_REREVIEW"},
            {"reviewer": "A08", "severity": "high", "finding": "R14 p3–4 topping cues differed; R13 p5–6 cooling/decorating cues differed; R11 p1 washing image conflicted with shared cucumber-cutting wording.", "remediation": "R14 panels 3–4 both show ADULT HELP while a grown-up prepares peppers and Aaria adds toppings; panels 5–6 are both ADULT ONLY for fryer loading/removal. R13 separates adult toast removal and topping preparation from child decoration after full cooling with adult help. R11 panel 1 washes all vegetables; panel 2 alone shows Mommy cutting cucumber with ADULT ONLY cue. Original shared step text remains preserved as source metadata; the displayed micro-action instructions separate those actions.", "panels": ["R11-P01", "R11-P02", "R13-P03", "R13-P04", "R13-P05", "R13-P06", "R14-P01", "R14-P02", "R14-P03", "R14-P04", "R14-P05", "R14-P06"], "status": "IMPLEMENTED_PENDING_REREVIEW"},
            {"reviewer": "A09", "severity": "high", "finding": "Repeated/abstract panels did not show clear action progression, including R12 mixing/cooking and R14 toppings.", "remediation": "All 30 panels now have distinct action keys and ordered micro-actions: mix, warm, spoon, flip, check/cool for R12; sauce, corn, peppers/cheese, fryer load, fryer remove/cool for R14. Each panel has a step number and a recipe-specific scene.", "panels": ["R11-P01..P06", "R12-P01..P06", "R13-P01..P06", "R14-P01..P06", "R15-P01..P06"], "status": "IMPLEMENTED_PENDING_REREVIEW"},
            {"reviewer": "A09", "severity": "medium", "finding": "Original cartoon characters were absent.", "remediation": "Reused the existing repository character assets Aaria, Mommy and Daddy in appropriate child/adult panels. Their source files remain unchanged; their SHA-256 values and repository paths are recorded. Rights remain unresolved.", "panels": ["all 30 panels"], "status": "IMPLEMENTED_PENDING_REREVIEW"},
            {"reviewer": "A09", "severity": "medium", "finding": "Source wording and SVG descriptions were English-only.", "remediation": "Added concise child-facing British English and Português-BR instructions, language tags, bilingual adult cues, and panel-specific English/Portuguese SVG accessible descriptions while preserving original source-step text in provenance metadata.", "panels": ["all 30 panels"], "status": "IMPLEMENTED_PENDING_REREVIEW"},
            {"reviewer": "A08/A09", "severity": "external_gate", "finding": "Artwork reuse rights are unresolved.", "remediation": "Retained provenance paths and source/character hashes; no rights approval is claimed. Keep B01 and release status on HOLD until rights are documented.", "panels": ["all 30 panels"], "status": "BLOCKED_UNRESOLVED_RIGHTS"}
        ],
        "formalApprovals": {"A08": "PENDING_INDEPENDENT_REREVIEW", "A09": "PENDING_INDEPENDENT_REREVIEW", "artworkRights": "UNRESOLVED"}
    }
    ledger_path = out / "remediation-ledger.json"
    ledger_path.write_text(json.dumps(ledger, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    (out / "remediation-ledger.md").write_text("# B01 finding-by-finding remediation ledger\n\n"+"\n".join(f"## {f['reviewer']} — {f['severity']}\n\n**Finding:** {f['finding']}\n\n**Remediation:** {f['remediation']}\n\n**Status:** {f['status']}\n" for f in ledger["findings"])+"\nFormal approvals: A08 pending independent re-review; A09 pending independent re-review; artwork rights unresolved. B01 remains on HOLD.\n", encoding="utf-8")

    manifest = {
        "schema": "w01-exact-artwork-batch-v2", "batch": "B01", "recipeIds": [11,12,13,14,15], "panelsPerAtlas": 6, "panelCount": 30,
        "sourceArchiveSha256": ARCHIVE_SHA,
        "state": {"DRAFTED": "DONE", "STAGED": "DONE", "INTEGRATED": "DEBUG_REVIEW_ONLY", "VERIFIED": "PENDING_INDEPENDENT_REREVIEW_AND_RIGHTS"},
        "releaseStatus": "HOLD", "productionRuntime": "NOT_INTEGRATED",
        "originalRecipeCatalog": {"count": 95, "changed": False},
        "sourceArtworkPreserved": True,
        "characters": char_manifest,
        "languageCoverage": ["en-GB", "pt-BR"],
        "approvalEvidence": "review-evidence.json", "previousReviewArtifactId": 12302803813,
        "remediationLedger": "remediation-ledger.json",
        "artworkRights": {"status": "UNRESOLVED", "clearanceClaimed": False},
        "contactSheet": {"svg": "contact-sheet.svg", "png": "contact-sheet.png"},
        "recipes": recipes,
    }
    files = []
    for path in sorted(p for p in out.rglob("*") if p.is_file() and p.name not in ("SHA256SUMS.txt", "manifest.json")):
        files.append({"path": str(path.relative_to(out)), "sha256": digest(path.read_bytes()), "bytes": path.stat().st_size})
    manifest["files"] = files
    manifest_path = out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    sums = []
    for path in sorted(p for p in out.rglob("*") if p.is_file() and p.name != "SHA256SUMS.txt"):
        sums.append(f"{digest(path.read_bytes())}  {path.relative_to(out)}\n")
    (out / "SHA256SUMS.txt").write_text("".join(sums), encoding="utf-8")
    print(json.dumps({"batch":"B01","recipeIds":manifest["recipeIds"],"atlases":5,"panels":30,"state":manifest["state"],"releaseStatus":"HOLD","characterAssetCount":len(char_manifest),"remediationFindings":len(ledger["findings"])},indent=2))
