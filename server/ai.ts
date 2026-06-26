import { GoogleGenAI } from "@google/genai";
import { DB } from "./db";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

export async function generateMessage({
  secteur,
  entreprise,
  type,
}: {
  secteur: string;
  entreprise: string;
  type: 'premier_contact' | 'relance_1' | 'relance_2' | 'relance_3';
}): Promise<string> {
  const config = DB.getConfig();
  const openAiKey = config.openai_key;

  const systemInstruction = `
Tu es le responsable marketing de IvoireSoft CI, spécialiste de la digitalisation en Côte d'Ivoire.
Services: développement web, applications mobiles, logiciels de gestion, e-commerce, IA intégrée.
Site: https://ivoiresoftci.com

Tu rédiges des messages de prospection WhatsApp B2B pour l'entreprise "${entreprise}" qui opère dans le secteur "${secteur}".

Ton message doit être rédigé en français ivoirien poli et chaleureux, mais professionnel, très direct et humain.

Format du message selon le TYPE :

1. Pour TYPE = 'premier_contact' (Premier contact de découverte) :
Bonjour,

[1 phrase d'accroche stimulante pour l'entreprise ${entreprise} sur le secteur ${secteur}]

❌ [problème opérationnel 1 spécifique au secteur ${secteur}, ex: gestion manuelle lente]
❌ [problème opérationnel 2 spécifique au secteur ${secteur}]
❌ [problème opérationnel 3 spécifique au secteur ${secteur}]

✅ [solution digitale 1 proposée par IvoireSoft CI, ex: logiciel automatisé]
✅ [solution digitale 2 proposée par IvoireSoft CI]
✅ [solution digitale 3 proposée par IvoireSoft CI]

Intéressé ? Répondez à ce message ou appelez le +225 0769999998

L'équipe IvoireSoft CI 🌐 ivoiresoftci.com

2. Pour TYPE = 'relance_1' (Relance douce à J+3) :
Rappel poli et bienveillant, axé sur un bénéfice fort de la digitalisation (ex: gain de temps, augmentation des ventes de 30%) adapté à leur secteur.
Conserve la même structure aérée avec des paragraphes courts.
CTA obligatoire : "Intéressé ? Répondez à ce message ou appelez le +225 0769999998"
Signature obligatoire : "L'équipe IvoireSoft CI 🌐 ivoiresoftci.com"

3. Pour TYPE = 'relance_2' (Relance d'urgence légère à J+6) :
Relance avec preuve sociale, mentionnant un exemple d'entreprise similaire en Côte d'Ivoire qui a réussi sa transformation digitale ou l'urgence de moderniser leurs outils face à la concurrence abidjanaise.
CTA obligatoire : "Intéressé ? Répondez à ce message ou appelez le +225 0769999998"
Signature obligatoire : "L'équipe IvoireSoft CI 🌐 ivoiresoftci.com"

4. Pour TYPE = 'relance_3' (Dernière tentative à J+9) :
Message d'adieu commercial poli, dernière chance de saisir une offre de diagnostic digital gratuit de 30 minutes.
CTA obligatoire : "Intéressé ? Répondez à ce message ou appelez le +225 0769999998"
Signature obligatoire : "L'équipe IvoireSoft CI 🌐 ivoiresoftci.com"

RÈGLES ABSOLUES :
- Respecte scrupuleusement le type demandé: "${type}".
- Chaque problème (❌) et solution (✅) sur SA PROPRE LIGNE, précédé d'une ligne vide.
- Le CTA est STRICTEMENT FIXE : "Intéressé ? Répondez à ce message ou appelez le +225 0769999998"
- La signature est STRICTEMENT FIXE : "L'équipe IvoireSoft CI 🌐 ivoiresoftci.com"
- Zéro placeholder entre crochets [] ou accolades {} dans le message final. Le message doit être 100% prêt à l'envoi.
- Problèmes et solutions SPÉCIFIQUES au secteur "${secteur}".
- N'invente pas d'autres numéros de téléphone.
- Pas de blabla d'introduction de l'IA (comme "Voici votre message :"). Donne UNIQUEMENT le texte du message.
`;

  const userPrompt = `Rédige le message pour l'entreprise "${entreprise}" dans le secteur "${secteur}".
TYPE DE MESSAGE REQUIS : "${type}".
Le message doit être 100% prêt à être envoyé par WhatsApp, sans aucun placeholder ni crochets.`;

  // 1. Try OpenAI if key is present
  if (openAiKey && openAiKey.startsWith('sk-')) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } else {
        const errorText = await response.text();
        console.error('OpenAI API Error:', errorText);
      }
    } catch (e) {
      console.error('Failed to generate with OpenAI, falling back to Gemini:', e);
    }
  }

  // 2. Fallback to Gemini 3.5 Flash
  const client = getGeminiClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });
      if (response.text) {
        return response.text.trim();
      }
    } catch (e) {
      console.error('Gemini generation failed:', e);
    }
  }

  // 3. Last fallback (Hardcoded premium templates if both APIs fail or key is absent)
  return getFallbackTemplate(secteur, entreprise, type);
}

function getFallbackTemplate(secteur: string, entreprise: string, type: string): string {
  const cta = "Intéressé ? Répondez à ce message ou appelez le +225 0769999998";
  const signature = "L'équipe IvoireSoft CI 🌐 ivoiresoftci.com";

  if (type === 'premier_contact') {
    return `Bonjour,\n\nNous avons remarqué le potentiel de ${entreprise} dans le secteur ${secteur}, et nous aimerions vous aider à booster votre visibilité en Côte d'Ivoire.\n\n❌ Pertes de clients par manque de suivi digital\n\n❌ Visibilité limitée sur internet par rapport aux concurrents\n\n❌ Gestion manuelle lourde de vos réservations et contacts\n\n✅ Création d'un site internet vitrine moderne et sur-mesure\n\n✅ Automatisation de vos relations clients par WhatsApp\n\n✅ Visibilité accrue sur Google Maps et les réseaux sociaux\n\n${cta}\n\n${signature}`;
  } else if (type === 'relance_1') {
    return `Bonjour ${entreprise},\n\nJ'espère que vous allez bien. Je me permets de vous relancer concernant notre précédent message. Saviez-vous qu'un site internet professionnel ou un assistant WhatsApp automatique peut augmenter l'acquisition de clients de plus de 35% pour les professionnels du secteur ${secteur} ?\n\nNous serions ravis d'échanger 5 minutes avec vous pour vous présenter des exemples concrets.\n\n${cta}\n\n${signature}`;
  } else if (type === 'relance_2') {
    return `Bonjour ${entreprise},\n\nNous constatons qu'à Abidjan, de plus en plus d'acteurs du domaine ${secteur} digitalisent leurs processus pour gagner en efficacité et fidéliser leurs clients. Ne laissez pas vos concurrents prendre l'avance !\n\nIvoireSoft CI vous accompagne pas à pas avec des solutions adaptées à votre budget.\n\n${cta}\n\n${signature}`;
  } else {
    return `Bonjour ${entreprise},\n\nC'est ma dernière tentative pour vous contacter. Nous offrons actuellement un audit digital gratuit de 30 minutes aux entreprises du secteur ${secteur}.\n\nC'est l'occasion idéale de faire le point sur vos outils numériques actuels sans aucun engagement.\n\n${cta}\n\n${signature}`;
  }
}
