# 📅 HollyWeek

> Aplicativo de organização acadêmica universitária: grade horária semanal, cálculo de notas por pesos e acompanhamento de prazos e faltas.

---

## 🚀 Tecnologias

- **React Native** + **Expo** (SDK 57)
- **TypeScript**
- **React Navigation** (Bottom Tabs & Stacks)
- **Firebase Firestore** (persistência em nuvem multi-usuário)
- **AsyncStorage** (cache de sessão local)

---

## 🛠️ Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão LTS recomendada)
- Gerenciador de pacotes `npm`

### Passos

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU-USUARIO/hollyweek.git
   cd hollyweek
   ```

2. **Instale as dependências:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run start
   ```

4. **Para rodar no navegador Web:**
   Pressione `w` no terminal ou execute:
   ```bash
   npm run web
   ```

---

## 📦 Gerar Build Web Estática

Para exportar os arquivos de produção para hospedagem (GitHub Pages, Vercel, Firebase, etc.):

```bash
npx expo export -p web --output-dir dist
```
Os arquivos prontos serão gerados dentro da pasta `dist/`.

---

## 📄 Licença
Distribuído sob a licença MIT.
