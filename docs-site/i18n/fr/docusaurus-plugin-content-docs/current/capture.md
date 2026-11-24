---
id: capture
title: Capturer des Documents
sidebar_position: 2
slug: /capture
---

# Capture de Documents

OSS Document Scanner offre des capacités de capture puissantes avec détection automatique des bords, plusieurs modes de capture et support de numérisation par lots.

![Capture Screen](/img/screenshots/documentscanner/2_fr-FR.jpg)

## Modes de Capture

### Capture Automatique

Le mode de capture par défaut utilise la détection intelligente des bords pour capturer automatiquement les documents lorsque :

- Le document est correctement positionné dans le viseur
- Les quatre bords sont détectés
- L'image est stable (pas de flou de mouvement)

**Comment utiliser la Capture Automatique :**

1. Maintenez votre appareil stable au-dessus du document
2. Attendez que le cadre vert apparaisse autour des bords du document
3. L'application capturera automatiquement lorsque les conditions sont optimales

### Capture Manuelle

Pour les situations où la capture automatique ne fonctionne pas bien (surfaces brillantes, faible contraste) :

1. Appuyez sur le bouton **Manuel** dans la barre d'outils de capture
2. Cadrez votre document dans le viseur
3. Appuyez sur le **bouton déclencheur** pour capturer

### Capture Continue

Parfaite pour numériser plusieurs pages en succession rapide :

1. Activez le **Mode Continu** dans les paramètres de capture
2. L'application capturera les pages les unes après les autres
3. Une brève pause entre les captures vous permet de tourner les pages

## Numérisation par Lots

La numérisation par lots vous permet de numériser plusieurs pages dans un seul document :

1. Commencez à capturer les pages normalement
2. Chaque page capturée est ajoutée au lot actuel
3. Examinez toutes les pages dans l'aperçu du lot
4. Appuyez sur **Terminé** lorsque vous avez fini pour créer le document

### Gestion des Pages du Lot

- **Réorganiser** : Glissez-déposez les pages pour les réarranger
- **Supprimer** : Balayez pour supprimer les pages non désirées
- **Re-numériser** : Appuyez sur une page pour la recapturer
- **Ajouter** : Continuez à numériser pour ajouter plus de pages

## Détection Automatique des Bords

L'application utilise la vision par ordinateur avancée (OpenCV) pour détecter les bords des documents :

### Comment Ça Marche

1. Le flux de la caméra est analysé en temps réel
2. Les contours sont détectés dans l'image
3. Les formes quadrilatérales sont identifiées comme documents potentiels
4. Le plus grand quadrilatère valide est sélectionné comme limite du document

### Conseils pour une Meilleure Détection

- **Bon éclairage** : Assurez un éclairage uniforme sans ombres prononcées
- **Contraste** : Placez les documents sur des fonds contrastés
- **Surface plane** : Gardez les documents à plat pour éviter les bords déformés
- **Objectif propre** : Nettoyez l'objectif de votre appareil photo pour des captures claires

### Ajustement Manuel

Si la détection automatique n'identifie pas parfaitement les bords :

1. Après la capture, l'écran d'ajustement des bords apparaît
2. Faites glisser les poignées de coin pour ajuster les limites du document
3. Faites glisser les points médians des bords pour des ajustements fins
4. Appuyez sur **Recadrer** pour appliquer la sélection

![Ajustement des Bords](/img/edit-1.png)

## Paramètres de l'Appareil Photo

Accédez aux paramètres de l'appareil photo en appuyant sur l'**icône engrenage** dans la vue de capture :

### Résolution

Choisissez la résolution de capture selon vos besoins :

- **Standard** : Traitement plus rapide, fichiers plus petits
- **Élevée** : Bon équilibre entre qualité et performance
- **Maximum** : Meilleure qualité, fichiers plus gros, traitement plus lent

### Contrôle du Flash

- **Auto** : Le flash se déclenche si nécessaire en faible luminosité
- **Activé** : Le flash se déclenche toujours
- **Désactivé** : Flash désactivé

### Mode de Mise au Point

- **Mise au Point Auto** : Appuyez pour faire la mise au point sur des zones spécifiques
- **Continue** : L'appareil photo ajuste continuellement la mise au point

## Dépannage

### Bords du document non détectés

- Assurez de bonnes conditions d'éclairage
- Utilisez un fond contrastant
- Essayez le mode de capture manuel
- Nettoyez l'objectif de votre appareil photo

### Captures floues

- Maintenez l'appareil stable
- Attendez que la mise au point automatique soit terminée
- Assurez un éclairage adéquat
- Essayez la mise au point manuelle en appuyant sur l'écran

### Capture automatique trop sensible/lente

- Ajustez la sensibilité de la capture automatique dans les paramètres
- Passez à la capture manuelle pour les documents difficiles
