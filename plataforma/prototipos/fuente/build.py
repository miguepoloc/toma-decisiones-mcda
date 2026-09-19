# Genera las 4 variantes HTML a partir de mcda_template.html:
#   ahp_asr_interactivo.html      -> artefacto publicado (FILEMODE=false, sin librería Excel)
#   mcda_blank_template.html      -> plantilla en blanco publicada
#   MCDA_ASR_Harold.html          -> autónomo con tus datos (FILEMODE=true + xlsx-js-style embebida)
#   MCDA_plantilla_en_blanco.html -> autónomo en blanco
# Requiere xlsxstyle.js (no versionado): curl -L -o xlsxstyle.js https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js
# Uso: python3 build.py   (desde esta carpeta; deja las salidas aquí; copia las autónomas a ../)
import json,re
seed=json.load(open('seed.json'))
T=open('mcda_template.html').read()
LIB=open('xlsxstyle.js').read()
def standalone(h):
    h=h.replace('<script>\n(function(){','<script>\n'+LIB+'\n</script>\n<script>\n(function(){',1)
    i=h.index('<div class="wrap"')
    return ('<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<style>body{margin:0}</style>\n'+h[:i]+'</head><body>\n'+h[i:]+'</body></html>')
mine=T.replace('/*SEED*/null',json.dumps(seed,ensure_ascii=False))
gen=["¿hay evidencia técnica o documental citable (paper, norma, documentación oficial) para todas las alternativas?","¿el dato es cuantitativo/verificable y comparable entre todas las alternativas?","¿la evidencia es consistente y actual (no contradictoria, no obsoleta)?","¿es independiente de los demás candidatos?","¿es directamente crítico para el objetivo de la decisión?"]
B=T.replace('<title>MCDA para ASR</title>','<title>Plantilla MCDA</title>')
B=B.replace("const KEY='mcda-asr-v2',OLD='ahp-asr-v1';","const KEY='mcda-plantilla-v1',OLD='__ninguno__';")
B=B.replace('Decisión multicriterio para la estrategia ASR','Decisión multicriterio: priorización y AHP')
B=B.replace('/*SEED*/null',json.dumps({"cands":[],"questions":gen,"objective":""},ensure_ascii=False))
new='''    crit:[1,2,3].map(i=>({id:'k'+(i-1),src:null,name:'Criterio '+i,hint:''})),
    alt:[1,2,3].map(i=>({id:'a'+(i-1),name:'Alternativa '+i})),
    experts:[1,2,3].map(i=>({id:'e'+(i-1),name:'Experto '+i})),
    J:{crit:{},alt:{}}};'''
B,n=re.subn(r"    crit:\[\n.*?    J:\{crit:\{\},alt:\{\}\}\};",new,B,flags=re.S);assert n==1
a="$('#objline').innerHTML='<b>Objetivo:</b> '+esc(S.obj);\n  const fin";assert a in B
B=B.replace(a,"$('#objline').innerHTML=S.obj.trim()?'<b>Objetivo:</b> '+esc(S.obj):'<span>Escribe el objetivo de tu decisión en la hoja 1 de la Parte A.</span>';\n  const fin")
B=B.replace("(por ejemplo «Dependencia de anotación»)","(por ejemplo costo o riesgo)").replace('sección del Anexo…','sección del documento…')
B=B.replace('<textarea id="obj" data-f="obj" style="min-height:58px">','<textarea id="obj" data-f="obj" style="min-height:58px" placeholder="Ej.: seleccionar la alternativa X que mejor cumpla Y en el contexto Z">')
open('ahp_asr_interactivo.html','w').write(mine)       # artefacto (FILEMODE=false)
open('mcda_blank_template.html','w').write(B)           # artefacto en blanco
open('MCDA_ASR_Harold.html','w').write(standalone(mine.replace('/*FILEMODE*/false','true')))
open('MCDA_plantilla_en_blanco.html','w').write(standalone(B.replace('/*FILEMODE*/false','true')))
print('built')
