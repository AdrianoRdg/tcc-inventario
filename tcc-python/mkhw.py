import re
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from netmiko import ConnectHandler
from netmiko.exceptions import NetMikoTimeoutException, NetMikoAuthenticationException

# ─── Dispositivos ────────────────────────────────────────────────────────────
DEVICES = [
    {
        'device_type': 'huawei',
        'host': '100.127.221.60',
        'username': 'gaydriano',
        'password': '@Qqww1122',
        'port': 2222,
    },
    {
        'device_type': 'mikrotik_routeros',
        'host': '100.127.221.29',
        'username': 'admin',
        'password': '',
        'port': 22,
    },
]

# ─── Parsers por vendor ───────────────────────────────────────────────────────

def parse_huawei(saida: str) -> dict:
    """
    Parseia 'display lldp neighbor' do Huawei.
    Retorna: { 'GE1/0/1': [ {neighbor_device, neighbor_interface, ...}, ... ] }
    """
    topologia = {}
    local_int = None
    vizinho_atual = {}

    for linha in saida.splitlines():
        linha = linha.strip()
        if not linha:
            continue

        # Nova interface com vizinhos
        match_int = re.match(r'^(\S+)\s+has\s+([1-9]\d*)\s+neighbor', linha)
        if match_int:
            local_int = match_int.group(1)
            vizinho_atual = {}
            if local_int not in topologia:
                topologia[local_int] = []
            continue

        # Interface sem vizinhos — ignora
        if re.match(r'^\S+\s+has\s+0\s+neighbor', linha):
            local_int = None
            continue

        # Separador de vizinhos (linha com hífens) — salva o atual e inicia novo
        if re.match(r'^-{10,}', linha) and local_int and vizinho_atual:
            topologia[local_int].append(vizinho_atual)
            vizinho_atual = {}
            continue

        match_kv = re.match(r'^(.*?)\s+:\s*(.*)$', linha)
        if match_kv and local_int is not None:
            chave = match_kv.group(1).strip()
            valor = match_kv.group(2).strip()

        mapa = {
            'System name':        'neighbor_device',
            'Port ID':            'neighbor_interface',
            'Chassis ID':         'chassis_id',
            'Management address': 'mgmt_address',
            'System capabilities':'capabilities',
            'Port description':   'port_description',
            'System description': 'system_description',  # ← adiciona isso
        }

        if chave in mapa:
            if chave == 'Management address' and valor == '--':
                continue
            vizinho_atual[mapa[chave]] = valor

            # Gatilho de fim de bloco do vizinho
        if chave == 'Discovered time' and vizinho_atual:
            topologia[local_int].append(vizinho_atual)
            vizinho_atual = {}

    return topologia


def parse_mikrotik(saida: str) -> dict:
    """
    Parseia '/ip neighbor print detail' do MikroTik.
    Formato real: cada vizinho é uma linha com 'iface chave=valor chave=valor ...'
    """
    topologia = {}

    for linha in saida.splitlines():
        linha = linha.strip()
        # Ignora linhas vazias, cabeçalhos e separadores
        if not linha or linha.startswith('Flags:') or linha.startswith('#'):
            continue
        # Remove índice numérico do início (ex: "0   ether1 ...")
        linha = re.sub(r'^\d+\s+', '', linha)

        # Primeiro token é a interface local
        partes = linha.split(' ', 1)
        if len(partes) < 2:
            continue
        local_int = partes[0]
        resto = partes[1]

        # Extrai todos os pares chave=valor (valores podem ter aspas)
        campos = {}
        for m in re.finditer(r'([\w-]+)=("(?:[^"\\]|\\.)*"|\S+)', resto):
            campos[m.group(1)] = m.group(2).strip('"')

        discovered_by = campos.get('discovered-by', '')
        if 'lldp' not in discovered_by:
            continue
        vizinho = {
            'neighbor_device':      campos.get('identity', ''),
            'neighbor_interface':   campos.get('interface-name', ''),
            'chassis_id':           campos.get('mac-address', ''),
            'mgmt_address':         campos.get('address4') or campos.get('address', ''),
            'capabilities':         campos.get('system-caps', ''),
            'discovered_by':        discovered_by,
            'system_description':   campos.get('system-description', ''),  # ← adiciona isso
        }

        # Só inclui se tiver ao menos o identity
        if vizinho['neighbor_device']:
            topologia.setdefault(local_int, []).append(vizinho)

    return topologia


# ─── Coleta por dispositivo ───────────────────────────────────────────────────

VENDOR_COMMANDS = {
    'huawei':            'display lldp neighbor',
    'mikrotik_routeros': '/ip neighbor print detail',
}

VENDOR_PARSERS = {
    'huawei':            parse_huawei,
    'mikrotik_routeros': parse_mikrotik,
}

def validar_acesso(device: dict) -> dict:
    """
    Testa a conexão SSH com o equipamento.
    Retorna um dicionário com o status e a mensagem de erro (se houver).
    """
    host = device.get('host')

    try:
        # Timeouts estendidos e global_delay_factor adicionado para equipamentos lentos (ex: NE9000)
        conn = ConnectHandler(**device, timeout=20, auth_timeout=20, global_delay_factor=2)
        conn.disconnect()
        return {"host": host, "valido": True, "erro": None}

    except NetMikoAuthenticationException:
        return {"host": host, "valido": False, "erro": "Falha de autenticação (usuário/senha incorretos)"}

    except NetMikoTimeoutException:
        return {"host": host, "valido": False, "erro": "Timeout (host offline, bloqueado pelo firewall ou porta incorreta)"}

    except Exception as e:
        return {"host": host, "valido": False, "erro": f"Erro de conexão: {str(e)}"}


def coletar_dispositivo(device: dict) -> tuple[str, dict | None, str | None]:
    """
    Conecta, coleta LLDP e parseia.
    Retorna (sysname, topologia, None) ou (host, None, motivo_erro) em caso de erro.
    """
    host = device['host']
    dtype = device['device_type']
    command = VENDOR_COMMANDS.get(dtype)
    parser  = VENDOR_PARSERS.get(dtype)

    if not command or not parser:
        return host, None, f"Vendor '{dtype}' não suportado"

    try:
        print(f"[INFO] Conectando a {host}...")
        conn = ConnectHandler(**device, timeout=30, auth_timeout=30, global_delay_factor=2)
        sysname = re.sub(r'[<>\[\]]', '', conn.find_prompt()).strip()
        saida = conn.send_command(command, read_timeout=60)
        conn.disconnect()
        topologia = parser(saida)
        print(f"[OK]   {sysname} ({host}) — {len(topologia)} interfaces com vizinhos")
        return sysname, topologia, None

    except NetMikoTimeoutException:
        print(f"[ERRO] Timeout: {host}")
        return host, None, "Timeout (Host offline ou bloqueado no firewall)"
        
    except NetMikoAuthenticationException:
        print(f"[ERRO] Falha de autenticação: {host}")
        return host, None, "Falha de autenticação (Usuário/Senha incorretos)"
        
    except Exception as e:
        print(f"[ERRO] {host}: {e}")
        return host, None, f"Erro de conexão: {str(e)}"


# ─── Coleta paralela ──────────────────────────────────────────────────────────

def coletar_topologia(devices: list, workers: int = 10) -> dict:
    resultado = {}
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futuros = {executor.submit(coletar_dispositivo, d): d for d in devices}
        for futuro in as_completed(futuros):
            nome, topologia = futuro.result()
            if topologia is not None:
                resultado[nome] = topologia
    return resultado

def construir_topologia(resultados: dict) -> list:
    # Coleta descrições que cada dispositivo reporta sobre si mesmo
    # via o que os vizinhos anunciam sobre eles
    descricoes = {}
    for hostname, interfaces in resultados.items():
        for vizinhos in interfaces.values():
            for v in vizinhos:
                nome = v.get('neighbor_device', '')
                desc = v.get('system_description', '')
                if nome and desc and nome not in descricoes:
                    # Pega só a primeira linha da descrição (evita o texto longo do Huawei)
                    descricoes[nome] = desc.split('\\r\\n')[0].strip()

    topologia = []
    for hostname, interfaces in resultados.items():
        device_entry = {
            "hostname":    hostname,
            "description": descricoes.get(hostname, ""),
            "interfaces":  []
        }

        for local_port, vizinhos in interfaces.items():
            for v in vizinhos:
                if not v.get('neighbor_device'):
                    continue
                device_entry["interfaces"].append({
                    "localPort":      local_port,
                    "remoteHostname": v.get("neighbor_device", ""),
                    "remotePort":     v.get("neighbor_interface", ""),
                })

        topologia.append(device_entry)

    return topologia

# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    resultados = coletar_topologia(DEVICES)
    topologia = construir_topologia(resultados)

    print("\n=== TOPOLOGIA FINAL ===")
    print(json.dumps(topologia, indent=4, ensure_ascii=False))

    with open('topologia.json', 'w', encoding='utf-8') as f:
        json.dump(topologia, f, indent=4, ensure_ascii=False)
    print("\n[OK] Salvo em topologia.json")