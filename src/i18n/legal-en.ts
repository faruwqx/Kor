/** Hukuki metinlerin İngilizcesi. legal.ts bunu OPERATOR ile çağırır (çalışma-zamanı döngüsü yok). */
import type { LegalDoc } from '../lib/legal'

interface Op {
  name: string
  address: string
  email: string
  registry: string
}

export function legalEn(O: Op): LegalDoc[] {
  return [
    {
      id: 'terms',
      title: 'Terms of Use',
      summary: 'The rules, responsibilities and limits that apply when you use Kor.',
      sections: [
        {
          h: '1. Parties and acceptance',
          p: [
            `These Terms of Use (“Terms”) form the agreement between ${O.name} (“Kor”, “we”), which provides the Kor app (the “App”), and the person using the App (“user”, “you”).`,
            'By installing the App, creating an account or continuing to use it, you accept these Terms and their integral parts: the Privacy Policy, the Health and Safety Notice, the Subscription and Refund Terms, and the Leaderboard and Community Rules. If you do not accept them, you should not use the App.',
            'Reading the documents is your choice; not reading them does not remove their binding effect.',
          ],
        },
        {
          h: '2. Description of the service',
          p: [
            'Kor is a logging and tracking tool for recording training sets, computing a “rank” per muscle group, tracking progress with charts, creating ready-made and custom routines, importing data from other apps, counting push-ups with the camera, and optionally joining a leaderboard.',
            'Kor is not a healthcare provider, trainer, dietitian or physiotherapist. Nothing in the App is medical advice, diagnosis or treatment. See the Health and Safety Notice for details.',
            'All values such as rank, level, estimated one-rep max, target weight and progress estimates are approximations based on general formulas; they are not an official grade, certificate or competition result.',
          ],
        },
        {
          h: '3. Age limit and capacity',
          p: [
            'You must be at least 16 to use the App. If you are under 18, you may use the App only with the knowledge and consent of your parent or guardian; only a parent or guardian may purchase paid subscriptions.',
            'If we learn that we are processing data belonging to someone under 16, we delete the account and the associated data.',
          ],
        },
        {
          h: '4. Account and security',
          p: [
            'The App can be used without an account; in that case your data is stored only on your device. An account is required for cloud backup, the leaderboard, live duels and Premium.',
            'You are responsible for the accuracy of your account details, the secrecy of your password and the actions taken with your account. If you notice unauthorized use, you must tell us immediately.',
            'You can delete your account from the Profile screen at any time. Deletion cannot be undone.',
          ],
        },
        {
          h: '5. Your obligations',
          p: [
            'You agree to use the App only for lawful, personal purposes; to exercise in a way suited to your own health; not to publish false results on the leaderboard; and not to infringe anyone else’s account, personal data or intellectual property rights.',
            'Reverse-engineering the App, trying to bypass security measures, overloading it with automated tools, spreading malware, and reselling or copying the App commercially without permission are prohibited.',
          ],
        },
        {
          h: '6. User content',
          p: [
            'The workouts, measurements, routines and files you import belong to you. When you use cloud backup or the leaderboard, you allow us to store and process that content to the extent needed to provide the service.',
            'The name and score shown on the leaderboard can be seen by other users who join the leaderboard.',
          ],
        },
        {
          h: '7. Paid features',
          p: [
            'The App’s core features are free. Premium features, the trial period, prices, renewal, cancellation and refunds are set out in the Subscription, Payment and Refund Terms.',
          ],
        },
        {
          h: '8. Continuity and changes',
          p: [
            'The App is provided “as is” and “as available”. It is not guaranteed to run without interruption, without error or on every device. We may change, suspend or discontinue features; if we discontinue a paid feature, your mandatory consumer rights to the fee for the unused period remain.',
            'Backing up your data is your responsibility. You can download a backup and a CSV file from the Profile screen at any time.',
          ],
        },
        {
          h: '9. Limitation of liability',
          p: [
            'To the maximum extent permitted by law, we are not liable for indirect damages arising from use or inability to use the App, loss of profit or data, injury or health issues during or after exercise, your device being dropped or damaged, or interruptions and errors in third-party services.',
            'This limitation does not cover damage from our intent or gross negligence, liability for death or bodily harm that cannot be limited by law, or your non-waivable rights under consumer law.',
            'Where liability can be limited by law, our total liability is limited to the amount you paid for the App in the twelve months before the damage arose.',
          ],
        },
        {
          h: '10. Suspension and termination',
          p: [
            'If you breach these Terms, the Community Rules or the law, we may suspend your account with or without notice, remove you from the leaderboard or terminate it. You may also delete your account at any time.',
            'Termination does not affect rights and obligations that arose before it, the liability limitations or the intellectual property provisions.',
          ],
        },
        {
          h: '11. Intellectual property',
          p: [
            'The App’s software, design, rank system, emblems, texts and the name “Kor” belong to us or our licensors. You are granted only a personal, non-transferable, non-exclusive and revocable right of use. See the Intellectual Property and Copyright Notice for details.',
          ],
        },
        {
          h: '12. Changes to the Terms',
          p: [
            'We may update the Terms. We announce important changes in the App and update the effective date. Continuing to use the App after a change means you accept the current Terms. If you do not accept them, you may stop using the App and delete your account.',
          ],
        },
        {
          h: '13. Governing law and disputes',
          p: [
            'These Terms are governed by the laws of the Republic of Türkiye. As a consumer, your right to apply to the consumer arbitration boards and consumer courts at your place of residence or where the transaction took place is reserved. If the mandatory consumer provisions of the country where you live give you stronger protection, those provisions continue to apply.',
            'If a provision of the Terms is held invalid, the remaining provisions stay in force. Our failure to exercise a right does not mean we waive it.',
          ],
        },
        { h: '14. Contact', p: [`${O.name} · ${O.address} · ${O.email} · ${O.registry}`] },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      summary: 'Where your data is stored, who it is shared with, and your rights.',
      sections: [
        {
          h: '1. Summary',
          p: [
            'By default, Kor stores your data only on your device. Unless you create an account, your workouts, measurements and settings never reach us.',
            'We show no ads, we do not sell your data, and we use no advertising or analytics trackers. Your camera feed never leaves your device.',
          ],
        },
        {
          h: '2. Data stored on your device',
          p: [
            'Profile: the name or nickname you enter, sex (to set rank thresholds), weekly training goal, and your answers to the setup questions (experience, goal, focus areas, obstacle).',
            'Training data: dates and durations, movements, sets, weight, reps and time values, your routines, movements you add yourself, your push-up counter results.',
            'Your bodyweight records and the rank, records and statistics computed from them.',
            'Settings: theme, unit system, language, rest time, vibration preference, and the version and date on which these documents were accepted.',
            'This data is kept in the browser’s or app’s local storage. Deleting the app or clearing browser data permanently removes it.',
          ],
        },
        {
          h: '3. Data that reaches us if you create an account',
          p: [
            'Identity and contact: your email address; if you sign in with Google or Apple, the account identifier and email that provider passes to us. Your password is not stored in plain text.',
            'Cloud backup: a copy of the device data listed above, to sync across devices and restore if lost.',
            'Subscription info: trial and subscription status, plan, period end date. We do not see or store payment details such as card numbers; the payment provider handles those.',
            'Leaderboard: only if you join, the display name you choose and your overall rank score.',
            'Live duel: during a duel your display name and rep count are sent to your opponent in real time; they are not stored permanently. Video and audio are not transmitted.',
            'Technical logs: the infrastructure provider may keep connection logs such as IP address, timestamp and device/browser information for a limited time for the security of the service.',
          ],
        },
        {
          h: '4. Camera',
          p: [
            'The push-up counter uses the camera only when you start it. The feed is processed on your device by a movement-recognition model shipped with the app; it is not recorded, not stored and not sent to any server or opponent. See the Camera and Push-up Counter Notice for details.',
          ],
        },
        {
          h: '5. Import and export',
          p: [
            'CSV, TSV and JSON files you import from other apps are read on your device; the file itself is not sent to us. Backup and CSV files you download are under your control; who you share them with is your responsibility.',
          ],
        },
        {
          h: '6. What we use data for',
          p: [
            'To provide the service: logging, rank computation, charts, backup and sync.',
            'To manage your account: sign-in, password reset, account deletion, verifying subscription status.',
            'Security and abuse prevention: blocking fake leaderboard results and unauthorized access.',
            'Legal obligations: duly issued requests from authorities and financial record-keeping duties.',
            'We do not use your data to build a marketing profile, target ads, or sell it to third parties.',
          ],
        },
        {
          h: '7. Who we share with',
          p: [
            'Infrastructure provider: Supabase is used for account, database and realtime services; data is processed on that provider’s servers on our behalf and under our instructions.',
            'Identity providers: if you choose to sign in with Google or Apple, that sign-in is subject to those companies’ own terms.',
            'Payment provider: if you buy Premium, payment is taken by the provider named on the payment page and your billing details are processed under its privacy policy.',
            'App stores: if you installed the app from a store, the store keeps download and in-app purchase records.',
            'Authorities: where legally required and only to the extent necessary.',
            'We do not share your data with anyone else.',
          ],
        },
        {
          h: '8. International transfer',
          p: [
            'The servers of the infrastructure, identity and payment providers we use may be located outside Türkiye. If you create an account, your data may be transferred to those servers. The transfer is made with the safeguards required by the applicable law and, where needed, based on your explicit consent.',
          ],
        },
        {
          h: '9. Retention periods',
          p: [
            'Device data: until you delete it or remove the app.',
            'Account and cloud data: for as long as your account is open. When you delete your account, your cloud backup, leaderboard record and account details are deleted; copies in backup systems are rotated out within a reasonable time.',
            'Payment and invoice records: for the period required by financial law.',
            'Connection logs: for the limited time required by the security purpose.',
          ],
        },
        {
          h: '10. Security',
          p: [
            'Communication with the server is over an encrypted connection; row-level access rules are applied in the database so each user can access only their own rows. No system is completely secure; you should protect your device with a screen lock and never share your password.',
            'If a security breach affecting your data occurs, we will inform the relevant authority and you within the periods required by law.',
          ],
        },
        {
          h: '11. Your rights',
          p: [
            'You have the rights to access, correct, delete, restrict processing of, port and object to the processing of your data. You can manage most of your data from within the App: download a backup, export CSV, leave the leaderboard, delete your account.',
            `For other requests, write to ${O.email}. We respond within thirty days at the latest. In Türkiye you may complain to the Personal Data Protection Authority; if you live in the European Economic Area, to your country’s data protection authority.`,
          ],
        },
        {
          h: '12. Users in the EEA and the UK',
          p: [
            'The data controller is the entity named at the end of this policy. Legal bases for processing: performance of a contract (providing the service), explicit consent (health-related data, cloud backup and the leaderboard), legitimate interest (security) and legal obligation (financial records). You can withdraw consent at any time; withdrawal does not affect the lawfulness of processing before it.',
            'No decision based solely on automated processing that produces legal effects concerning you is made.',
          ],
        },
        {
          h: '13. Children',
          p: [
            'The App is not designed for anyone under 16 and we do not knowingly collect data from that age group. A parent or guardian who notices such a case can write to us to request deletion.',
          ],
        },
        {
          h: '14. Changes and contact',
          p: [
            'When we update this policy we change the effective date and announce important changes in the App.',
            `Data controller: ${O.name} · ${O.address} · ${O.email}`,
          ],
        },
      ],
    },
    {
      id: 'kvkk',
      title: 'KVKK Disclosure (Türkiye)',
      summary: 'Data-controller disclosure under Article 10 of Turkish Law No. 6698.',
      sections: [
        {
          h: '1. Data controller',
          p: [
            `Under Turkish Law No. 6698 on the Protection of Personal Data (“KVKK”), your personal data is processed by ${O.name} (${O.address}) as data controller, within the scope described below.`,
            'In use without an account, your data is kept only on your own device and does not reach us; in that case the processing activities below do not occur.',
          ],
        },
        {
          h: '2. Personal data processed',
          p: [
            'Identity and contact: name or nickname, email address, account identifier at a third-party sign-in provider.',
            'Usage data: workout records, routines, rank score, push-up results, settings.',
            'Potentially health-related data: bodyweight, sex and exercise performance. As this may be special-category personal data, it is transferred to the cloud only with your explicit consent.',
            'Transaction security: IP address, session and connection logs.',
            'Customer transaction: subscription status, plan and period information.',
          ],
        },
        {
          h: '3. Purposes of processing',
          p: [
            'Creating and managing your account; backing up data and syncing it across devices; providing the leaderboard and duel features; verifying subscription rights; ensuring information security and preventing abuse; answering your requests; meeting obligations arising from legislation.',
          ],
        },
        {
          h: '4. Legal grounds',
          p: [
            'KVKK art. 5/2-c: necessity for the establishment and performance of a contract (account, backup, subscription).',
            'KVKK art. 5/2-ç: fulfilment of a legal obligation (financial records, requests from authorities).',
            'KVKK art. 5/2-f: legitimate interest, provided it does not harm your fundamental rights and freedoms (security, abuse prevention).',
            'KVKK art. 5/1 and art. 6: explicit consent (transfer of health-related data to the cloud, display of your name and score on the leaderboard, international transfer).',
          ],
        },
        {
          h: '5. Method of collection',
          p: [
            'Data is collected electronically through information you enter into the App yourself, information you provide when creating an account, information passed by sign-in providers, and automated means while the App connects to the server.',
          ],
        },
        {
          h: '6. Transfer',
          p: [
            'Data may be transferred, in line with the conditions in KVKK art. 8 and art. 9, to the infrastructure provider from which we obtain hosting, database and authentication services, to the payment provider for payment transactions, to the identity provider you choose for sign-in, and to legally authorized public bodies.',
            'As those providers’ servers may be located abroad, an international transfer may be involved; such a transfer relies on the safeguards in KVKK art. 9 and, where needed, your explicit consent.',
          ],
        },
        {
          h: '7. Your rights under KVKK art. 11',
          p: [
            'You have the rights to: learn whether your personal data is processed; request information about it if it is; learn the purpose of processing and whether it is used accordingly; know the third parties to whom it is transferred domestically or abroad; request its correction if incomplete or incorrect; request its deletion or destruction within the conditions of KVKK art. 7; request that correction and deletion be notified to the third parties to whom it was transferred; object to a result against you arising solely from automated analysis; and claim compensation for damage caused by unlawful processing.',
          ],
        },
        {
          h: '8. Application',
          p: [
            `You can submit your requests in writing, with information verifying your identity, to ${O.email} or to ${O.address}. Your application is concluded free of charge within thirty days at the latest; if the process entails an additional cost, the fee in the tariff set by the Personal Data Protection Board may be charged.`,
            'If your application is rejected, you find the response insufficient, or you receive no timely response, you may lodge a complaint with the Personal Data Protection Board.',
          ],
        },
      ],
    },
    {
      id: 'consent',
      title: 'Explicit Consent',
      summary: 'The scope of health-related data and international transfer when you create an account.',
      sections: [
        {
          h: '1. Subject of consent',
          p: [
            'When you create an account and use cloud backup, you give your explicit consent, of your own free will and knowing you had the chance to read the KVKK Disclosure, to:',
            'storing your bodyweight records, your sex and your training performance (weights, reps, durations you lift) on servers for the purpose of backup and cross-device sync,',
            'transferring that data and your account details to the infrastructure provider whose servers may be located abroad,',
            'if you choose to join the leaderboard, showing your display name and overall rank score to other users.',
          ],
        },
        {
          h: '2. Consent is not mandatory',
          p: [
            'You do not have to give this consent. Without an account you can use the App’s logging, rank, chart, routine and push-up counter features; in that case your data never leaves your device.',
          ],
        },
        {
          h: '3. Withdrawing consent',
          p: [
            'You can withdraw your consent at any time: leave the leaderboard to remove your leaderboard record, and delete your account to remove your cloud backup and account details. Withdrawal takes effect going forward.',
            `For requests you cannot complete within the App, write to ${O.email}.`,
          ],
        },
      ],
    },
    {
      id: 'health',
      title: 'Health and Safety Notice',
      summary: 'Kor gives no medical advice; the risks of exercise are yours.',
      sections: [
        {
          h: '1. Not medical advice',
          p: [
            'Kor is a logging and tracking tool. Rank thresholds, target weights, estimated one-rep maxes, progress estimates, ready-made routines, movement descriptions and visuals in the App are for general information; they do not replace an assessment by a doctor, physiotherapist or trainer.',
          ],
        },
        {
          h: '2. Consult a doctor before starting',
          p: [
            'You should consult your doctor before starting a new exercise program. This is essential if you have cardiovascular disease, high blood pressure, diabetes, asthma, a joint, spine or musculoskeletal problem, a recent surgery or injury, are pregnant or postpartum, take regular medication, or have been inactive for a long time.',
          ],
        },
        {
          h: '3. Stop immediately',
          p: [
            'If you feel chest pain or pressure, shortness of breath, dizziness, faintness, palpitations, nausea, numbness, or a sharp, unusual pain, stop exercising at once and seek medical help. In an emergency, call your local emergency number.',
          ],
        },
        {
          h: '4. Risks of weight training',
          p: [
            'Lifting weights carries serious risks including muscle, ligament, joint and spine injury, being pinned under a weight, and falling. Training with proper form, warming up, choosing a weight you can control, using a spotter and safety bars on heavy sets, and checking that equipment is sound are your responsibility.',
            'The target weight or the weight needed for the next rank shown by the App is not advice or an instruction; only you and your trainer, if any, can decide whether you are ready to attempt it.',
          ],
        },
        {
          h: '5. Rank and leaderboard pressure',
          p: [
            'Do not sacrifice your form, rest or health to raise your rank or move up the leaderboard. Rank thresholds are derived from general averages by bodyweight and sex; they do not account for your age, height, injury history or individual differences.',
          ],
        },
        {
          h: '6. Bodyweight tracking',
          p: [
            'The bodyweight chart is for logging only; it contains no recommendation to lose or gain weight. If you have a history of an eating disorder or weight tracking affects you negatively, we recommend you not use this feature and that you consult a professional.',
          ],
        },
        {
          h: '7. Push-up counter and device',
          p: [
            'When placing the phone on the floor, choose a spot where it will not tip over, be stepped on or obstruct people around you. Damage from the device being dropped, broken or getting wet is yours.',
          ],
        },
        {
          h: '8. Assumption of risk',
          p: [
            'By using the App you accept that you understand the risks inherent in exercise and assume them of your own will. To the extent permitted by law, we are not liable for injury or health issues during or after exercise. Liability from our intent or gross negligence, which cannot be limited by law, is reserved.',
          ],
        },
      ],
    },
    {
      id: 'camera',
      title: 'Camera and Push-up Counter Notice',
      summary: 'Your video never leaves your device; only the rep count is shared.',
      sections: [
        {
          h: '1. When the camera opens',
          p: [
            'The camera opens only when you start the push-up counter and your device has granted camera permission. It closes when you leave the counter. You can revoke the permission from device settings at any time; the counter then will not work, and the rest of the App is unaffected.',
          ],
        },
        {
          h: '2. How the feed is processed',
          p: [
            'The camera feed is processed on your device, in real time, by a body-pose recognition model shipped with the app. The model only extracts the positions of joints such as shoulder, elbow, wrist and hip; these points are used to count reps and are discarded as soon as counting ends.',
            'No video or image is recorded, stored on your device or sent to any server. No face recognition is performed; no biometric template that could identify you is created.',
          ],
        },
        {
          h: '3. What your opponent sees in a live duel',
          p: [
            'Your opponent cannot see or hear you. During a duel only your display name and live rep count are transmitted. This information is not stored on the server once the duel ends.',
          ],
        },
        {
          h: '4. Other people in frame',
          p: [
            'Place the camera so that other people do not enter the frame. Do not use the camera in shared spaces where there is an expectation of privacy, such as a locker room. Even though no video is recorded, making sure others are not disturbed is your responsibility.',
          ],
        },
        {
          h: '5. Accuracy of counting',
          p: [
            'Depending on lighting, camera angle, clothing and distance, the counter may count reps short or over. Results are for fun and personal tracking; they are not an official measurement or competition result. We accept no liability for rank or leaderboard differences caused by counting errors.',
          ],
        },
      ],
    },
    {
      id: 'subscription',
      title: 'Subscription, Payment and Refund Terms',
      summary: 'Trial, renewal, cancellation, right of withdrawal and refunds.',
      sections: [
        {
          h: '1. Free and Premium',
          p: [
            'The App’s core features are free. Premium is a digital subscription service that unlocks the extra features listed on the payment page and the Premium screen. Premium’s scope may change over time; the core benefits offered to you in your current period are kept until the period ends.',
          ],
        },
        {
          h: '2. Free trial',
          p: [
            'You can start a free trial once per account, for the period stated on the Premium screen. If no payment details are requested for the trial, it does not convert to a paid subscription on its own when it ends; Premium features turn off and you return to the free version. If payment details are taken during the trial, this is stated clearly on the payment page.',
          ],
        },
        {
          h: '3. Price and payment',
          p: [
            'The current price, currency, taxes and billing period are shown on the payment page before you buy; the amount on that page is what binds. The price may vary by your billing country.',
            'Payment is taken by the payment provider or app store named on the payment page. In that case the party to the sales contract and the issuer of the invoice may be that provider; we do not see your card details.',
          ],
        },
        {
          h: '4. Automatic renewal',
          p: [
            'Monthly and yearly subscriptions renew on their own for the same period and at the price in effect at that date, unless cancelled before the period ends. We notify you of price changes a reasonable time before renewal; if you do not accept, you can cancel before renewal.',
          ],
        },
        {
          h: '5. Cancellation',
          p: [
            'You can cancel your subscription at any time, through the channel you bought it from (the payment provider’s customer portal or the app store’s subscription settings). Cancellation takes effect at the end of your current period; Premium stays on until then and no partial refund is given for the remaining time.',
            'Deleting the app or your account does not cancel a subscription bought through a store on its own; you must cancel it separately.',
          ],
        },
        {
          h: '6. Right of withdrawal',
          p: [
            'As a consumer, you generally have a 14-day right to withdraw from distance contracts without giving a reason.',
            'However, Premium is a service performed instantly online and intangible digital content. When you approve that the service begins immediately at purchase, under the exceptions to the right of withdrawal in the Distance Contracts Regulation you may not be able to use the right of withdrawal for the service whose performance has begun. This approval is obtained separately on the payment page.',
            'If the mandatory consumer legislation of the country where you live grants a broader right of withdrawal or refund, those rights are reserved.',
          ],
        },
        {
          h: '7. Refunds',
          p: [
            'You can request a refund in the case of a duplicate charge, an unauthorized transaction, or the service not being provided for a reason attributable to us. For purchases made through an app store, refunds are subject to the store’s own refund process.',
            `For other refund requests, write to ${O.email} with your order details; we will review your request within a reasonable time.`,
          ],
        },
        {
          h: '8. Unpaid period',
          p: [
            'If a renewal payment cannot be taken, we may suspend Premium features. Your data is not deleted; you continue to access it within the limits of the free version.',
          ],
        },
        {
          h: '9. Disputes',
          p: [
            'We kindly ask that you send complaints to us first. In Türkiye, within the monetary limits announced each year by the Ministry of Trade, you can apply to the consumer arbitration board at your place of residence or where the transaction took place; above those limits, to the consumer court.',
          ],
        },
      ],
    },
    {
      id: 'community',
      title: 'Leaderboard and Community Rules',
      summary: 'Display name, honest results and duel conduct.',
      sections: [
        {
          h: '1. Participation is optional',
          p: [
            'Joining the leaderboard and live duels is not mandatory. When you join, the display name you choose and your score are shown to other participants. You can leave the leaderboard at any time; when you leave, your record is deleted.',
          ],
        },
        {
          h: '2. Display name',
          p: [
            'You do not have to use your real name. Your display name may not contain insults, hate speech, sexual content, threats, impersonation of another person or brand, advertising or contact details. We may change inappropriate names or remove the record.',
          ],
        },
        {
          h: '3. Honest results',
          p: [
            'Log only sets you genuinely completed on your own. Entering made-up weights or reps, publishing someone else’s result as your own, misleading the counter, and gaining points by manipulating the App or the server are prohibited.',
            'Results rely on user declaration; the server does not verify lifts. For that reason the leaderboard is not an official competition, a position on it does not create any prize, title or right, and we do not guarantee its accuracy.',
          ],
        },
        {
          h: '4. Duel conduct',
          p: [
            'Be respectful to your opponent. Do not use duels to harass an opponent or disrupt the service. Do not break your form by overexerting yourself; whatever your opponent does, the Health and Safety Notice applies.',
          ],
        },
        {
          h: '5. Enforcement',
          p: [
            'We may delete records that break the rules, reset a score, remove a user from the leaderboard or duels temporarily or permanently, and close an account if necessary. If you see a suspicious result or an inappropriate name, you can report it to us.',
            `Reports and appeals: ${O.email}`,
          ],
        },
      ],
    },
    {
      id: 'storage',
      title: 'Cookie and Local Storage Policy',
      summary: 'No advertising or tracking cookies; only storage needed for the app to work.',
      sections: [
        {
          h: '1. We use no cookies',
          p: [
            'Kor uses no advertising, analytics or third-party tracking cookies. We do not track you across sites or apps.',
          ],
        },
        {
          h: '2. Local storage',
          p: [
            'Your workouts, profile and settings are kept in your device’s local storage (localStorage). This storage is required for the App to work; without it your records would be lost on every launch.',
            'If you sign in to your account, a session token is also kept in local storage to keep you signed in. It is deleted when you sign out.',
          ],
        },
        {
          h: '3. Offline cache',
          p: [
            'The App’s files (the interface, fonts, movement visuals and the push-up counter’s model) are cached on your device so it can work without internet. This cache contains no personal data.',
          ],
        },
        {
          h: '4. Camera permission',
          p: [
            'The camera permission you grant for the push-up counter is kept in your device’s or browser’s permission settings and can be revoked there.',
          ],
        },
        {
          h: '5. How to delete',
          p: [
            'You can delete all device data in the App with the reset option on the Profile screen. Clearing your browser’s site data or uninstalling the app also deletes local storage and the cache. These actions cannot be undone; we recommend taking a backup first.',
          ],
        },
      ],
    },
    {
      id: 'ip',
      title: 'Intellectual Property and Copyright Notice',
      summary: 'Rights belonging to Kor, third-party trademarks and infringement reports.',
      sections: [
        {
          h: '1. Rights belonging to Kor',
          p: [
            'The App’s source code, interface design, rank system and tier names, emblems, icons, texts, and the name and logo “Kor” belong to us or our licensors and are protected by intellectual property law. They may not be copied, reproduced, modified, distributed or used commercially without our written permission.',
          ],
        },
        {
          h: '2. Your content',
          p: [
            'Your own workout records and the data you import belong to you. You can export them at any time.',
          ],
        },
        {
          h: '3. Third-party names and trademarks',
          p: [
            'Strong, Hevy and FitNotes mentioned on the import screen, and other product and company names referenced in the App, are the trademarks of their owners. These names are used only to identify a file format; Kor is not affiliated with, endorsed by or approved by those companies.',
            'Movement names and routine types (for example “Push Pull Legs”) are common sports terms in general use.',
          ],
        },
        {
          h: '4. Open-source components',
          p: [
            'The App includes open-source software and fonts distributed under their own licenses. The rights to these components belong to their owners and the relevant license terms apply.',
          ],
        },
        {
          h: '5. Infringement report',
          p: [
            `If you believe a piece of content in the App infringes your intellectual property rights, write to ${O.email} with information showing you are the rights holder, a description of the content you believe infringes, and your contact details. We review the report and, if we find it justified, remove the content within a reasonable time.`,
          ],
        },
      ],
    },
  ]
}
