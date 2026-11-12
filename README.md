# Bairro em Pauta

Aplicativo (PWA) que reúne o que é noticiado sobre o seu bairro e permite enviar relatos com um **sistema de verificação em 3 camadas** contra fake news.

- **Front-end:** React + TypeScript + Vite (PWA instalável no celular), mapa com Leaflet/OpenStreetMap
- **Back-end:** Django + Django REST Framework + PostgreSQL
- **Telas:** Início, Mapa, Agenda, Relatos e Enviar um relato (+ Entrar)

## Como rodar

### 1. Banco de dados
```bash
docker compose up -d        # PostgreSQL na porta 5432
```
(Sem Docker, use um PostgreSQL seu e ajuste `backend/.env`, ou rode com SQLite: `USE_SQLITE=1`.)

### 2. Back-end
```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations core
python manage.py migrate
python manage.py seed                                  # dados de exemplo
python manage.py runserver                             # http://localhost:8000
```

### 3. Front-end
```bash
cd frontend
npm install
npm run dev                                            # http://localhost:5173
```
Abra no celular pela rede local (o Vite mostra o endereço `Network`). Para instalar como app: menu do navegador > "Adicionar à tela inicial".

> O GPS do navegador exige HTTPS fora do `localhost`. Para testar no celular com GPS, use um túnel HTTPS (ex.: ngrok/cloudflared). Sem GPS, o app usa uma localização de demonstração (Cidade Universitária, Recife).

### Contas de exemplo (comando `seed`)
| Usuário | Senha | Papel |
|---|---|---|
| `redacao` | `redacao123` | Redação (staff): verifica/descarta relatos no app e no painel `/admin/` |
| `morador1` a `morador5` | `morador123` | Moradores, com reputações diferentes |

## Como funciona a verificação

1. **Triagem automática** (`backend/core/services.py > run_triage`): confere se o autor está a até 2 km do local, descrição mínima, linguagem sensacionalista ou de corrente, presença de foto e possíveis duplicados (300 m / 3 h). Limite de 5 relatos por hora por usuário.
2. **Comunidade** (`refresh_community_status`): só moradores a até 1,5 km confirmam, e não o próprio autor. Cada confirmação tem **peso pela reputação** (1,0 / 1,5 / 2,0). Ao somar 3,0 o relato vira *Confirmado pela comunidade*. Três denúncias devolvem o relato para análise.
3. **Redação** (`apply_review`): quem tem perfil staff verifica ou descarta. Verificar dá +5 de reputação ao autor e +1 a quem confirmou; descartar tira 10 do autor.

Status exibidos: *Em análise* → *Confirmado pela comunidade* → *Verificado pela redação* (ou *Descartado*).

## API (resumo)
`POST /api/auth/register/` · `POST /api/auth/login/` · `GET /api/me/` · `GET /api/map/?lat&lng&radius_km&only_verified` · `GET/POST /api/reports/?tab=verificados|analise|meus` · `POST /api/reports/{id}/confirm|flag|review/` · `GET /api/events/?date=AAAA-MM-DD` · `POST /api/events/{id}/reminder/` · `GET /api/neighborhoods/`

## Limites conhecidos (próximos passos)
- Fotos não passam por busca reversa de imagem nem leitura de metadados; a triagem só checa se existe anexo.
- O local do relato é o GPS do autor (não há seletor no mapa ainda).
- Lembretes da Agenda usam notificações do navegador enquanto o app está aberto; notificações push em segundo plano exigem Web Push no servidor.
- Dados de bairros e coordenadas do `seed` são aproximados. Em produção: `DEBUG=0`, `SECRET_KEY` própria, HTTPS e armazenamento de mídia externo.

## Publicar online

Back-end e banco no **Render**, front-end na **Vercel** (os dois têm plano gratuito com limites; confira as condições atuais).

1. Suba a pasta do projeto para um repositório no GitHub.
2. **Render:** *New > Blueprint*, escolha o repositório (usa o `render.yaml`). Ele cria o PostgreSQL e o back-end e roda `backend/build.sh`. Anote o endereço, ex.: `https://bairro-em-pauta-api.onrender.com`.
3. **Vercel:** *Add New > Project*, mesmo repositório, *Root Directory* = `frontend`. Em *Environment Variables* crie `VITE_API_URL` com o endereço do Render (sem barra no final) e faça o deploy. Anote o link, ex.: `https://bairro-em-pauta.vercel.app`.
4. **Volte ao Render** > serviço > *Environment* e preencha `CORS_ALLOWED_ORIGINS` e `CSRF_TRUSTED_ORIGINS` com o link da Vercel. Salve (ele reinicia).
5. Abra o link da Vercel no celular. Como é HTTPS, o **GPS funciona**.

**Antes de divulgar:** troque a senha da conta `redacao` (painel `/admin/` do back-end) e, se não quiser dados de exemplo, mude `SEED` para `0`. Fotos enviadas ficam no disco do servidor, que no plano gratuito é apagado a cada novo deploy; para uso real, use armazenamento externo (S3, Cloudinary).
