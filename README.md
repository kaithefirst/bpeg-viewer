# bPEG Viewer

Site web pour visualiser les NFTs bPEG sur Base Sepolia.

## Fichiers

```
bpeg-viewer/
├── index.html   ← page principale
├── style.css    ← design
├── app.js       ← logique blockchain
└── README.md
```

## Déploiement sur Vercel (2 minutes)

### Option A — Via l'interface web (le plus simple)

1. Va sur **https://vercel.com** et crée un compte gratuit
2. Clique **Add New → Project**
3. Clique **Upload** (pas besoin de GitHub)
4. Glisse-dépose le dossier `bpeg-viewer/`
5. Clique **Deploy**
6. Ton site est en ligne sur `bpeg-viewer.vercel.app` !

### Option B — Via GitHub

1. Crée un repo GitHub et upload les 3 fichiers
2. Va sur **https://vercel.com** → Import Git Repository
3. Sélectionne ton repo → Deploy
4. Mises à jour automatiques à chaque push

### Option C — Via Netlify

1. Va sur **https://netlify.com**
2. Glisse-dépose le dossier sur la page d'accueil
3. Ton site est live instantanément

## Contrat

- Network : Base Sepolia (chainId 84532)
- Token   : `0x4F3c803bbF62f46c76bf8f4aFf107393c007813a`
- BaseScan : https://sepolia.basescan.org/address/0x4F3c803bbF62f46c76bf8f4aFf107393c007813a

## Pour le mainnet

Quand tu déploies sur Base mainnet, change dans `app.js` :

```js
const CONTRACT = "NOUVELLE_ADRESSE_MAINNET";
const RPC      = "https://mainnet.base.org";
const SCAN     = "https://basescan.org";
```

## License

MIT
