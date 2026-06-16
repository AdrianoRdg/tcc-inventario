# api.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import re, json

# ─── Importa as funções que você já tem ──────────────────────────────────────
from mkhw import coletar_dispositivo, construir_topologia, VENDOR_COMMANDS, VENDOR_PARSERS, validar_acesso

app = FastAPI(title="LLDP Topology API")

# ─── Modelo do dispositivo (o JSON que o Adriano vai mandar) ─────────────────
class Device(BaseModel):
    id:          str
    name:        str
    ip:          str
    port:        int
    login:       str
    password:    str
    location:    Optional[str] = ""
    type:        Optional[str] = ""   # "Router", "Switch", etc.
    status:      Optional[str] = ""
    createdAt:   Optional[str] = ""
    updatedAt:   Optional[str] = ""

@app.get("/hello")
def hello():
    return {"message": "hello world adriano gay"}

# ─── Rota principal ───────────────────────────────────────────────────────────
@app.post("/topology")
def get_topology(devices: list[Device]):
    if not devices:
        raise HTTPException(status_code=400, detail="Lista de dispositivos vazia")

    def resolve_vendor(d: Device) -> str:
        vendor = (d.type or '').lower()
        if 'mikrotik' in vendor:
            return 'mikrotik_routeros'
        name = (d.name or '').lower()
        if 'mikrotik' in name or 'mtk' in name or 'chr' in name or 'mk' in name:
            return 'mikrotik_routeros'
        return 'huawei'

    def to_netmiko(d: Device) -> dict:
        return {
            "device_type": resolve_vendor(d),
            "host":        d.ip,
            "username":    d.login,
            "password":    d.password,
            "port":        d.port,
        }

    resultados = {}
    falhas = []

    # Mapeamos o futuro diretamente para o objeto 'Device' original enviado no JSON
    with ThreadPoolExecutor(max_workers=10) as executor:
        futuros = {executor.submit(coletar_dispositivo, to_netmiko(d)): d for d in devices}
        
        for futuro in as_completed(futuros):
            device_original = futuros[futuro] # Resgata o objeto completo (id, name, ip, port...)
            nome_ou_host, topologia, erro_msg = futuro.result()
            
            if topologia is not None:
                resultados[nome_ou_host] = topologia
            else:
                # Guarda os dados do dispositivo original junto com o motivo do erro
                falhas.append({
                    "device": device_original,
                    "erro": erro_msg
                })

    # Monta a topologia dos que deram certo
    topologia_final = construir_topologia(resultados)

    # Injeta os blocos de erro padronizados mantendo a estrutura que você quer
    for f in falhas:
        d = f["device"]
        topologia_final.append({
            "hostname": "ACCESS_ERROR",
            "description": f["erro"],          # Motivo detalhado do erro
            "failed_name": d.name,             # Nome original informado
            "failed_ip": d.ip,                 # IP original informado
            "failed_port": d.port,             # Porta original informada
            "interfaces": []                   # Vazio para não quebrar loops no React
        })

    return topologia_final

