/**
 * Hukuki metinler. Tek kaynak: Yasal ekranı, kurulum, hesap ve Premium bağlantıları buradan okur.
 *
 * Bu metinler taslaktır; yayından önce bir avukata okutulmalı ve aşağıdaki OPERATOR
 * alanları gerçek bilgilerle doldurulmalıdır. Metin değiştiğinde LEGAL_VERSION artırılır:
 * kullanıcının hangi sürümü kabul ettiği ayarlarda saklanır.
 */

import { lang } from './i18n'
import { legalEn } from '../i18n/legal-en'

export const LEGAL_VERSION = '1.0'
export const LEGAL_EFFECTIVE = '14 Kasım 2026'

/** Hizmeti sunan kişi ya da şirket. Köşeli parantezli alanlar yayından önce doldurulmalı. */
export const OPERATOR = {
  name: '[Şirket unvanı ya da ad soyad]',
  address: '[Açık adres]',
  email: '[destek e-posta adresi]',
  registry: '[MERSİS / vergi numarası, varsa]',
}

/** Doldurulmamış alan kaldıysa true: yayın öncesi kontrol için. */
export function operatorIncomplete(): boolean {
  return Object.values(OPERATOR).some((v) => v.includes('['))
}

export type LegalId =
  | 'terms'
  | 'privacy'
  | 'kvkk'
  | 'consent'
  | 'health'
  | 'camera'
  | 'subscription'
  | 'community'
  | 'storage'
  | 'ip'

export interface LegalSection {
  h: string
  p: string[]
}

export interface LegalDoc {
  id: LegalId
  title: string
  summary: string
  sections: LegalSection[]
}

const O = OPERATOR

const LEGAL_DOCS_TR: LegalDoc[] = [
  {
    id: 'terms',
    title: 'Kullanım Koşulları',
    summary: 'Kor’u kullanırken geçerli kurallar, sorumluluklar ve sınırlar.',
    sections: [
      {
        h: '1. Taraflar ve kabul',
        p: [
          `Bu Kullanım Koşulları (“Koşullar”), Kor uygulamasını (“Uygulama”) sunan ${O.name} (“Kor”, “biz”) ile Uygulama’yı kullanan kişi (“kullanıcı”, “sen”) arasındaki sözleşmedir.`,
          'Uygulama’yı kurarak, bir hesap oluşturarak ya da kullanmaya devam ederek bu Koşullar’ı ve bunların ayrılmaz parçası olan Gizlilik Politikası, Sağlık ve Güvenlik Uyarısı, Abonelik ve İade Koşulları ile Sıralama ve Topluluk Kuralları’nı kabul etmiş olursun. Kabul etmiyorsan Uygulama’yı kullanmamalısın.',
          'Metinleri okumak senin tercihindir; okumamış olman bağlayıcılığını ortadan kaldırmaz.',
        ],
      },
      {
        h: '2. Hizmetin tanımı',
        p: [
          'Kor; antrenman setlerini kaydetmeye, kas gruplarına göre bir “rank” hesaplamaya, ilerlemeyi grafiklerle izlemeye, hazır ve kişisel programlar oluşturmaya, başka uygulamalardan veri aktarmaya, kamerayla şınav saymaya ve isteğe bağlı olarak sıralamaya katılmaya yarayan bir kayıt ve takip aracıdır.',
          'Kor bir sağlık kuruluşu, antrenör, diyetisyen ya da fizyoterapist değildir. Uygulama’daki hiçbir içerik tıbbi tavsiye, teşhis ya da tedavi niteliği taşımaz. Ayrıntı için Sağlık ve Güvenlik Uyarısı’na bak.',
          'Rank, seviye, tahmini tekrar maksimumu, hedef kilo ve ilerleme tahmini gibi tüm değerler genel formüllere dayanan yaklaşık hesaplardır; resmî bir derece, sertifika ya da yarışma sonucu değildir.',
        ],
      },
      {
        h: '3. Yaş sınırı ve ehliyet',
        p: [
          'Uygulama’yı kullanmak için en az 16 yaşında olmalısın. 18 yaşından küçüksen Uygulama’yı ancak velinin ya da vasinin bilgisi ve onayıyla kullanabilirsin; ücretli abonelikleri yalnızca veli ya da vasi satın alabilir.',
          '16 yaşından küçük bir kişiye ait veri işlediğimizi fark edersek hesabı ve ilişkili verileri sileriz.',
        ],
      },
      {
        h: '4. Hesap ve güvenlik',
        p: [
          'Uygulama hesap açmadan kullanılabilir; bu durumda verilerin yalnızca cihazında saklanır. Bulut yedeği, sıralama, canlı düello ve Premium için hesap gerekir.',
          'Hesap bilgilerinin doğru olmasından, şifrenin gizliliğinden ve hesabınla yapılan işlemlerden sen sorumlusun. Yetkisiz kullanım fark edersen bize hemen bildirmelisin.',
          'Hesabını dilediğin zaman Profil ekranından silebilirsin. Silme işlemi geri alınamaz.',
        ],
      },
      {
        h: '5. Kullanıcının yükümlülükleri',
        p: [
          'Uygulama’yı yalnızca hukuka uygun ve kişisel amaçlarla kullanacağını; kendi sağlık durumuna uygun egzersiz yapacağını; sıralamada gerçeğe aykırı sonuç yayımlamayacağını; başkasının hesabını, kişisel verisini ya da fikrî hakkını ihlal etmeyeceğini kabul edersin.',
          'Uygulama’yı tersine mühendislikle çözmek, güvenlik önlemlerini aşmaya çalışmak, otomatik araçlarla aşırı yük oluşturmak, kötü amaçlı yazılım yaymak ve Uygulama’yı izinsiz biçimde ticari amaçla yeniden satmak ya da kopyalamak yasaktır.',
        ],
      },
      {
        h: '6. Kullanıcı içeriği',
        p: [
          'Kaydettiğin antrenmanlar, ölçümler, programlar ve içe aktardığın dosyalar sana aittir. Bulut yedeğini ya da sıralamayı kullandığında, bu içeriği hizmeti sunmak için gereken ölçüde saklamamıza ve işlememize izin vermiş olursun.',
          'Sıralamada görünen ad ve puan, sıralamaya katılan diğer kullanıcılar tarafından görülebilir.',
        ],
      },
      {
        h: '7. Ücretli özellikler',
        p: [
          'Uygulama’nın temel özellikleri ücretsizdir. Premium özellikler, deneme süresi, fiyatlar, yenileme, iptal ve iade Abonelik, Ödeme ve İade Koşulları’nda düzenlenir.',
        ],
      },
      {
        h: '8. Hizmetin sürekliliği ve değişiklikler',
        p: [
          'Uygulama “olduğu gibi” ve “mevcut olduğu ölçüde” sunulur. Kesintisiz, hatasız ya da her cihazda sorunsuz çalışacağı garanti edilmez. Özellikleri değiştirebilir, askıya alabilir ya da sonlandırabiliriz; ücretli bir özelliği sonlandırırsak kullanılmayan döneme ait bedel hakkındaki zorunlu tüketici hakların saklıdır.',
          'Verilerinin yedeğini almak senin sorumluluğundadır. Profil ekranından dilediğin zaman yedek ve CSV dosyası indirebilirsin.',
        ],
      },
      {
        h: '9. Sorumluluğun sınırlandırılması',
        p: [
          'Hukukun izin verdiği azami ölçüde; Uygulama’nın kullanımından ya da kullanılamamasından doğan dolaylı zararlardan, kâr ya da veri kaybından, egzersiz sırasında ya da sonrasında oluşan yaralanma ve sağlık sorunlarından, cihazının düşmesi ya da zarar görmesinden, üçüncü taraf hizmetlerindeki kesinti ve hatalardan sorumlu değiliz.',
          'Bu sınırlama; kastımızdan ya da ağır kusurumuzdan doğan zararları, ölüm ya da bedensel zarara ilişkin kanunen sınırlandırılamayan sorumluluğu ve tüketici mevzuatından doğan vazgeçilemez haklarını kapsamaz.',
          'Kanunen sınırlandırılabilen hâllerde toplam sorumluluğumuz, zararın doğduğu tarihten önceki on iki ayda Uygulama için ödediğin tutarla sınırlıdır.',
        ],
      },
      {
        h: '10. Askıya alma ve fesih',
        p: [
          'Bu Koşullar’ı, Topluluk Kuralları’nı ya da hukuku ihlal etmen hâlinde hesabını uyarıyla ya da uyarısız askıya alabilir, sıralamadan çıkarabilir ya da sonlandırabiliriz. Sen de hesabını dilediğin zaman silebilirsin.',
          'Fesih; fesih anına kadar doğmuş hak ve borçları, sorumluluk sınırlamalarını ve fikrî mülkiyet hükümlerini etkilemez.',
        ],
      },
      {
        h: '11. Fikrî mülkiyet',
        p: [
          'Uygulama’nın yazılımı, tasarımı, rank sistemi, amblemleri, metinleri ve “Kor” adı bize ya da lisans verenlerimize aittir. Sana yalnızca kişisel, devredilemez, münhasır olmayan ve geri alınabilir bir kullanım hakkı tanınır. Ayrıntı için Fikrî Mülkiyet ve Telif Bildirimi’ne bak.',
        ],
      },
      {
        h: '12. Koşullarda değişiklik',
        p: [
          'Koşullar’ı güncelleyebiliriz. Önemli değişiklikleri Uygulama içinde duyururuz ve yürürlük tarihini güncelleriz. Değişiklikten sonra Uygulama’yı kullanmaya devam etmen, güncel Koşullar’ı kabul ettiğin anlamına gelir. Kabul etmiyorsan kullanımı bırakabilir ve hesabını silebilirsin.',
        ],
      },
      {
        h: '13. Uygulanacak hukuk ve uyuşmazlıklar',
        p: [
          'Bu Koşullar Türkiye Cumhuriyeti hukukuna tabidir. Tüketici sıfatıyla; yerleşim yerindeki ya da işlemin yapıldığı yerdeki tüketici hakem heyetlerine ve tüketici mahkemelerine başvurma hakkın saklıdır. Yaşadığın ülkenin emredici tüketici hükümleri sana daha güçlü bir koruma sağlıyorsa o hükümler uygulanmaya devam eder.',
          'Koşullar’ın bir hükmü geçersiz sayılırsa diğer hükümler yürürlükte kalır. Bir hakkımızı kullanmamış olmamız o haktan vazgeçtiğimiz anlamına gelmez.',
        ],
      },
      {
        h: '14. İletişim',
        p: [`${O.name} · ${O.address} · ${O.email} · ${O.registry}`],
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Gizlilik Politikası',
    summary: 'Hangi verilerin nerede saklandığı, kimlerle paylaşıldığı ve hakların.',
    sections: [
      {
        h: '1. Özet',
        p: [
          'Kor varsayılan olarak verilerini yalnızca cihazında saklar. Hesap açmadığın sürece antrenmanların, ölçümlerin ve ayarların bize ulaşmaz.',
          'Reklam göstermiyoruz, verilerini satmıyoruz, reklam ya da analitik izleyicisi kullanmıyoruz. Kamera görüntün cihazından çıkmaz.',
        ],
      },
      {
        h: '2. Cihazında saklanan veriler',
        p: [
          'Profil: yazdığın ad ya da takma ad, cinsiyet (rank eşiklerini belirlemek için), haftalık antrenman hedefi ve kurulum sorularına verdiğin cevaplar (deneyim, amaç, odak bölgeler, engel).',
          'Antrenman verileri: tarih ve süreler, hareketler, setler, ağırlık, tekrar ve süre değerleri, programların, kendi eklediğin hareketler, şınav sayacı sonuçların.',
          'Vücut ağırlığı kayıtların ve bunlardan hesaplanan rank, rekor ve istatistikler.',
          'Ayarlar: tema, birim sistemi, dinlenme süresi, titreşim tercihi ve bu metinlerin kabul edildiği sürüm ile tarih.',
          'Bu veriler tarayıcının ya da uygulamanın yerel depolamasında tutulur. Uygulamayı silmen ya da tarayıcı verilerini temizlemen bu verileri kalıcı olarak siler.',
        ],
      },
      {
        h: '3. Hesap açarsan bize ulaşan veriler',
        p: [
          'Kimlik ve iletişim: e-posta adresin; Google ya da Apple ile giriş yaparsan bu sağlayıcının bize ilettiği hesap kimliği ve e-posta. Şifren düz metin olarak saklanmaz.',
          'Bulut yedeği: yukarıda sayılan cihaz verilerinin bir kopyası, cihazlar arasında eşitlemek ve kaybolursa geri yüklemek için.',
          'Abonelik bilgisi: deneme ve abonelik durumu, plan, dönem bitiş tarihi. Kart numarası gibi ödeme bilgilerini biz görmeyiz ve saklamayız; bunları ödeme sağlayıcısı işler.',
          'Sıralama: yalnızca sıralamaya katılırsan, seçtiğin görünen ad ve genel rank puanın.',
          'Canlı düello: düello sırasında görünen adın ve tekrar sayın rakibine anlık olarak iletilir; kalıcı olarak saklanmaz. Görüntü ve ses iletilmez.',
          'Teknik kayıtlar: altyapı sağlayıcısı, hizmetin güvenliği için IP adresi, zaman damgası ve cihaz/tarayıcı bilgisi gibi bağlantı kayıtlarını sınırlı süreyle tutabilir.',
        ],
      },
      {
        h: '4. Kamera',
        p: [
          'Şınav sayacı kamerayı yalnızca sen başlattığında kullanır. Görüntü cihazında, uygulamayla birlikte gelen bir hareket tanıma modeliyle işlenir; kaydedilmez, saklanmaz ve hiçbir sunucuya ya da rakibine gönderilmez. Ayrıntı için Kamera ve Şınav Sayacı Bilgilendirmesi’ne bak.',
        ],
      },
      {
        h: '5. İçe ve dışa aktarma',
        p: [
          'Başka uygulamalardan aktardığın CSV, TSV ve JSON dosyaları cihazında okunur; dosyanın kendisi bize gönderilmez. İndirdiğin yedek ve CSV dosyaları senin denetimindedir; bunları kimlerle paylaştığın senin sorumluluğundadır.',
        ],
      },
      {
        h: '6. Verileri ne için kullanıyoruz',
        p: [
          'Hizmeti sunmak: kayıt, rank hesabı, grafikler, yedekleme ve eşitleme.',
          'Hesabını yönetmek: giriş, şifre sıfırlama, hesap silme, abonelik durumunu doğrulama.',
          'Güvenlik ve kötüye kullanımın önlenmesi: sahte sıralama sonuçlarının ve yetkisiz erişimin engellenmesi.',
          'Hukuki yükümlülükler: yetkili makamların usulüne uygun talepleri ve mali kayıt yükümlülükleri.',
          'Verilerini pazarlama profili çıkarmak, reklam hedeflemek ya da üçüncü kişilere satmak için kullanmıyoruz.',
        ],
      },
      {
        h: '7. Kimlerle paylaşıyoruz',
        p: [
          'Altyapı sağlayıcısı: hesap, veritabanı ve anlık iletişim hizmeti için Supabase kullanılır; veriler bu sağlayıcının sunucularında, bizim adımıza ve talimatımızla işlenir.',
          'Kimlik sağlayıcıları: Google ya da Apple ile giriş yapmayı seçersen, giriş işlemi bu şirketlerin kendi koşullarına tabidir.',
          'Ödeme sağlayıcısı: Premium satın alırsan ödeme, ödeme sayfasında adı belirtilen sağlayıcı tarafından alınır ve fatura bilgilerin onun gizlilik politikasına göre işlenir.',
          'Uygulama mağazaları: uygulamayı bir mağazadan indirdiysen, indirme ve mağaza içi satın alma kayıtlarını mağaza tutar.',
          'Yetkili makamlar: kanunen zorunlu olduğunda ve yalnızca gereken ölçüde.',
          'Bunların dışında verilerini kimseyle paylaşmıyoruz.',
        ],
      },
      {
        h: '8. Yurt dışına aktarım',
        p: [
          'Kullandığımız altyapı, kimlik ve ödeme sağlayıcılarının sunucuları Türkiye dışında bulunabilir. Hesap açman hâlinde verilerin bu sunuculara aktarılabilir. Aktarım, ilgili mevzuatın öngördüğü güvencelerle ve gerektiğinde açık rızana dayanılarak yapılır.',
        ],
      },
      {
        h: '9. Saklama süreleri',
        p: [
          'Cihaz verileri: sen silene ya da uygulamayı kaldırana kadar.',
          'Hesap ve bulut verileri: hesabın açık olduğu sürece. Hesabını sildiğinde bulut yedeğin, sıralama kaydın ve hesap bilgilerin silinir; yedekleme sistemlerindeki kopyalar makul bir süre içinde dönüşümlü olarak silinir.',
          'Ödeme ve fatura kayıtları: mali mevzuatın zorunlu kıldığı süre boyunca.',
          'Bağlantı kayıtları: güvenlik amacının gerektirdiği sınırlı süre boyunca.',
        ],
      },
      {
        h: '10. Güvenlik',
        p: [
          'Sunucuyla iletişim şifreli bağlantı üzerinden yapılır; veritabanında her kullanıcı yalnızca kendi satırlarına erişebilecek biçimde satır düzeyinde erişim kuralları uygulanır. Hiçbir sistem tamamen güvenli değildir; cihazını ekran kilidiyle koruman ve şifreni kimseyle paylaşmaman gerekir.',
          'Verilerini etkileyen bir güvenlik ihlali olursa mevzuatın öngördüğü sürelerde ilgili kurumu ve seni bilgilendiririz.',
        ],
      },
      {
        h: '11. Hakların',
        p: [
          'Verilerine erişme, düzeltme, silme, işlemeyi kısıtlama, taşıma ve itiraz etme haklarına sahipsin. Verilerinin çoğunu Uygulama içinden kendin yönetebilirsin: yedeği indir, CSV olarak dışa aktar, sıralamadan çık, hesabı sil.',
          `Diğer talepler için ${O.email} adresine yazabilirsin. Talebini en geç otuz gün içinde yanıtlarız. Türkiye’de Kişisel Verileri Koruma Kurulu’na, Avrupa Ekonomik Alanı’nda yaşıyorsan bulunduğun ülkenin veri koruma otoritesine şikâyet hakkın vardır.`,
        ],
      },
      {
        h: '12. Avrupa Ekonomik Alanı ve Birleşik Krallık’taki kullanıcılar',
        p: [
          'Veri sorumlusu bu politikanın sonunda belirtilen kişidir. İşlemenin hukuki dayanakları: sözleşmenin ifası (hizmetin sunulması), açık rıza (sağlıkla ilgili veriler, bulut yedeği ve sıralama), meşru menfaat (güvenlik) ve hukuki yükümlülük (mali kayıtlar). Rızanı dilediğin zaman geri çekebilirsin; geri çekme, öncesindeki işlemenin hukuka uygunluğunu etkilemez.',
          'Yalnızca otomatik işlemeye dayanan ve hakkında hukuki sonuç doğuran bir karar verilmez.',
        ],
      },
      {
        h: '13. Çocuklar',
        p: [
          'Uygulama 16 yaşından küçükler için tasarlanmamıştır ve bilerek bu yaş grubundan veri toplamayız. Böyle bir durumu fark eden veli ya da vasi bize yazarak silme talep edebilir.',
        ],
      },
      {
        h: '14. Değişiklikler ve iletişim',
        p: [
          'Bu politikayı güncellediğimizde yürürlük tarihini değiştirir, önemli değişiklikleri Uygulama içinde duyururuz.',
          `Veri sorumlusu: ${O.name} · ${O.address} · ${O.email}`,
        ],
      },
    ],
  },
  {
    id: 'kvkk',
    title: 'KVKK Aydınlatma Metni',
    summary: '6698 sayılı Kanun’un 10. maddesi uyarınca veri sorumlusunun bilgilendirmesi.',
    sections: [
      {
        h: '1. Veri sorumlusu',
        p: [
          `6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca kişisel verilerin, veri sorumlusu sıfatıyla ${O.name} (${O.address}) tarafından aşağıda açıklanan kapsamda işlenmektedir.`,
          'Hesap açmadan yaptığın kullanımda verilerin yalnızca kendi cihazında tutulur ve tarafımıza ulaşmaz; bu durumda aşağıdaki işleme faaliyetleri gerçekleşmez.',
        ],
      },
      {
        h: '2. İşlenen kişisel veriler',
        p: [
          'Kimlik ve iletişim: ad ya da takma ad, e-posta adresi, üçüncü taraf giriş sağlayıcısındaki hesap kimliği.',
          'Kullanım verileri: antrenman kayıtları, programlar, rank puanı, şınav sonuçları, ayarlar.',
          'Sağlıkla ilişkili olabilecek veriler: vücut ağırlığı, cinsiyet ve egzersiz performansı. Bu veriler özel nitelikli kişisel veri sayılabileceğinden yalnızca açık rızanla buluta aktarılır.',
          'İşlem güvenliği: IP adresi, oturum ve bağlantı kayıtları.',
          'Müşteri işlem: abonelik durumu, plan ve dönem bilgisi.',
        ],
      },
      {
        h: '3. İşleme amaçları',
        p: [
          'Hesabın oluşturulması ve yönetilmesi; verilerin yedeklenmesi ve cihazlar arasında eşitlenmesi; sıralama ve düello özelliklerinin sunulması; abonelik haklarının doğrulanması; bilgi güvenliğinin sağlanması ve kötüye kullanımın önlenmesi; taleplerinin yanıtlanması; mevzuattan doğan yükümlülüklerin yerine getirilmesi.',
        ],
      },
      {
        h: '4. Hukuki sebepler',
        p: [
          'KVKK m.5/2-c: sözleşmenin kurulması ve ifası için gerekli olması (hesap, yedek, abonelik).',
          'KVKK m.5/2-ç: hukuki yükümlülüğün yerine getirilmesi (mali kayıtlar, yetkili makam talepleri).',
          'KVKK m.5/2-f: temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaat (güvenlik, kötüye kullanımın önlenmesi).',
          'KVKK m.5/1 ve m.6: açık rıza (sağlıkla ilişkili verilerin buluta aktarılması, sıralamada ad ve puanın görünmesi, yurt dışına aktarım).',
        ],
      },
      {
        h: '5. Toplama yöntemi',
        p: [
          'Veriler; Uygulama’ya kendi girdiğin bilgiler, hesap oluştururken ilettiğin bilgiler, giriş sağlayıcılarının ilettiği bilgiler ve Uygulama’nın sunucuyla kurduğu bağlantı sırasında otomatik yollarla elektronik ortamda toplanır.',
        ],
      },
      {
        h: '6. Aktarım',
        p: [
          'Veriler; barındırma, veritabanı ve kimlik doğrulama hizmeti aldığımız altyapı sağlayıcısına, ödeme işlemleri için ödeme sağlayıcısına, giriş için seçtiğin kimlik sağlayıcısına ve kanunen yetkili kamu kurumlarına, KVKK m.8 ve m.9’da öngörülen şartlara uygun olarak aktarılabilir.',
          'Bu sağlayıcıların sunucuları yurt dışında bulunabileceğinden yurt dışına aktarım söz konusu olabilir; bu aktarım KVKK m.9’daki güvencelere ve gerektiğinde açık rızana dayanır.',
        ],
      },
      {
        h: '7. KVKK m.11 kapsamındaki hakların',
        p: [
          'Kişisel verinin işlenip işlenmediğini öğrenme; işlenmişse buna ilişkin bilgi talep etme; işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme; yurt içinde ya da yurt dışında aktarıldığı üçüncü kişileri bilme; eksik ya da yanlış işlenmişse düzeltilmesini isteme; KVKK m.7’deki şartlar çerçevesinde silinmesini ya da yok edilmesini isteme; düzeltme ve silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme; işlenen verilerin münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhine bir sonucun ortaya çıkmasına itiraz etme; kanuna aykırı işleme sebebiyle zarara uğraman hâlinde zararın giderilmesini talep etme haklarına sahipsin.',
        ],
      },
      {
        h: '8. Başvuru',
        p: [
          `Taleplerini kimliğini doğrulayan bilgilerle birlikte ${O.email} adresine ya da ${O.address} adresine yazılı olarak iletebilirsin. Başvurun en geç otuz gün içinde ücretsiz olarak sonuçlandırılır; işlemin ayrıca bir maliyet gerektirmesi hâlinde Kişisel Verileri Koruma Kurulu’nun belirlediği tarifedeki ücret alınabilir.`,
          'Başvurunun reddedilmesi, yanıtın yetersiz bulunması ya da süresinde yanıt verilmemesi hâlinde Kişisel Verileri Koruma Kurulu’na şikâyette bulunabilirsin.',
        ],
      },
    ],
  },
  {
    id: 'consent',
    title: 'Açık Rıza Metni',
    summary: 'Hesap açtığında sağlıkla ilişkili verilerin ve yurt dışına aktarımın kapsamı.',
    sections: [
      {
        h: '1. Rızanın konusu',
        p: [
          'Hesap oluşturup bulut yedeğini kullandığında; vücut ağırlığı kayıtlarının, cinsiyet bilginin ve antrenman performansının (kaldırdığın ağırlıklar, tekrarlar, süreler) yedekleme ve cihazlar arası eşitleme amacıyla sunucularda saklanmasına,',
          'bu verilerin ve hesap bilgilerinin, sunucuları yurt dışında bulunabilen altyapı sağlayıcısına aktarılmasına,',
          'sıralamaya katılmayı seçersen görünen adının ve genel rank puanının diğer kullanıcılara gösterilmesine',
          'KVKK Aydınlatma Metni’ni okuma imkânın olduğunu bilerek, özgür iradenle açık rıza vermiş olursun.',
        ],
      },
      {
        h: '2. Rıza zorunlu değildir',
        p: [
          'Bu rızayı vermek zorunda değilsin. Hesap açmadan Uygulama’nın kayıt, rank, grafik, program ve şınav sayacı özelliklerini kullanabilirsin; bu durumda verilerin cihazından çıkmaz.',
        ],
      },
      {
        h: '3. Rızanın geri alınması',
        p: [
          'Rızanı dilediğin zaman geri alabilirsin: sıralamadan çıkarak sıralama kaydını, hesabını silerek bulut yedeğini ve hesap bilgilerini kaldırabilirsin. Geri alma ileriye dönük sonuç doğurur.',
          `Uygulama içinden yapamadığın talepler için ${O.email} adresine yazabilirsin.`,
        ],
      },
    ],
  },
  {
    id: 'health',
    title: 'Sağlık ve Güvenlik Uyarısı',
    summary: 'Kor tıbbi tavsiye vermez; egzersizin riskleri sana aittir.',
    sections: [
      {
        h: '1. Tıbbi tavsiye değildir',
        p: [
          'Kor bir kayıt ve takip aracıdır. Uygulama’daki rank eşikleri, hedef kilolar, tahmini tekrar maksimumları, ilerleme tahminleri, hazır programlar, hareket açıklamaları ve görselleri genel bilgilendirme amaçlıdır; hekim, fizyoterapist ya da antrenör değerlendirmesinin yerini tutmaz.',
        ],
      },
      {
        h: '2. Başlamadan önce hekime danış',
        p: [
          'Yeni bir egzersiz programına başlamadan önce hekimine danışmalısın. Özellikle kalp-damar hastalığı, yüksek tansiyon, diyabet, astım, eklem, omurga ya da kas-iskelet sorunu, yakın zamanda geçirilmiş ameliyat ya da sakatlık, gebelik ya da doğum sonrası dönem, düzenli ilaç kullanımı varsa ya da uzun süredir hareketsizsen bu zorunludur.',
        ],
      },
      {
        h: '3. Hemen dur',
        p: [
          'Göğüs ağrısı ya da baskısı, nefes darlığı, baş dönmesi, bayılma hissi, çarpıntı, bulantı, uyuşma ya da keskin, alışılmadık bir ağrı hissedersen egzersizi derhal bırak ve tıbbi yardım al. Acil durumda 112’yi ara.',
        ],
      },
      {
        h: '4. Ağırlık çalışmasının riskleri',
        p: [
          'Ağırlık kaldırmak; kas, bağ, eklem ve omurga yaralanması, ağırlığın altında kalma ve düşme gibi ciddi riskler taşır. Doğru teknikle çalışmak, ısınmak, kontrol edebileceğin ağırlığı seçmek, ağır setlerde yardımcı (gözcü) ve emniyet barı kullanmak ve ekipmanın sağlam olduğunu denetlemek senin sorumluluğundadır.',
          'Uygulama’nın gösterdiği hedef kilo ya da bir sonraki rank için gereken ağırlık bir tavsiye ya da talimat değildir; o ağırlığı denemeye hazır olup olmadığına yalnızca sen ve varsa antrenörün karar verebilirsiniz.',
        ],
      },
      {
        h: '5. Rank ve sıralama baskısı',
        p: [
          'Rank yükseltmek ya da sıralamada öne geçmek için tekniğinden, dinlenmenden ya da sağlığından ödün verme. Rank eşikleri vücut ağırlığına ve cinsiyete göre genel ortalamalardan türetilmiştir; yaşını, boyunu, sakatlık geçmişini ve bireysel farklılıklarını hesaba katmaz.',
        ],
      },
      {
        h: '6. Vücut ağırlığı takibi',
        p: [
          'Vücut ağırlığı grafiği yalnızca kayıt amaçlıdır; kilo vermen ya da alman yönünde bir öneri içermez. Yeme bozukluğu geçmişin varsa ya da kilo takibi seni olumsuz etkiliyorsa bu özelliği kullanmamanı ve bir uzmana başvurmanı öneririz.',
        ],
      },
      {
        h: '7. Şınav sayacı ve cihaz',
        p: [
          'Telefonu yere koyarken devrilmeyeceği, üzerine basılmayacağı ve çevrendekilere engel olmayacağı bir yer seç. Cihazın düşmesi, kırılması ya da ıslanmasından doğan zararlar sana aittir.',
        ],
      },
      {
        h: '8. Riski üstlenme',
        p: [
          'Uygulama’yı kullanarak egzersizin doğasında bulunan riskleri bildiğini ve bu riskleri kendi isteğinle üstlendiğini kabul edersin. Hukukun izin verdiği ölçüde, egzersiz sırasında ya da sonrasında oluşan yaralanma ve sağlık sorunlarından sorumlu değiliz. Kastımızdan ya da ağır kusurumuzdan doğan ve kanunen sınırlandırılamayan sorumluluk saklıdır.',
        ],
      },
    ],
  },
  {
    id: 'camera',
    title: 'Kamera ve Şınav Sayacı Bilgilendirmesi',
    summary: 'Görüntün cihazından çıkmaz; yalnızca tekrar sayısı paylaşılır.',
    sections: [
      {
        h: '1. Kamera ne zaman açılır',
        p: [
          'Kamera yalnızca şınav sayacını sen başlattığında ve cihazın kamera iznini verdiğinde açılır. Sayaçtan çıktığında kamera kapanır. İzni cihaz ayarlarından dilediğin zaman geri alabilirsin; bu durumda sayaç çalışmaz, Uygulama’nın geri kalanı etkilenmez.',
        ],
      },
      {
        h: '2. Görüntü nasıl işlenir',
        p: [
          'Kamera görüntüsü, uygulamayla birlikte gelen bir vücut duruşu tanıma modeliyle cihazının üzerinde, anlık olarak işlenir. Model yalnızca omuz, dirsek, bilek ve kalça gibi eklem noktalarının konumunu çıkarır; bu noktalar tekrar saymak için kullanılır ve sayım biter bitmez atılır.',
          'Görüntü ya da video kaydedilmez, cihazında saklanmaz ve hiçbir sunucuya gönderilmez. Yüz tanıma yapılmaz; kimliğini belirlemeye yarayan biyometrik şablon oluşturulmaz.',
        ],
      },
      {
        h: '3. Canlı düelloda rakibin ne görür',
        p: [
          'Rakibin seni göremez ve duyamaz. Düello sırasında yalnızca görünen adın ve anlık tekrar sayın iletilir. Bu bilgiler düello bittiğinde sunucuda saklanmaz.',
        ],
      },
      {
        h: '4. Görüş alanındaki diğer kişiler',
        p: [
          'Kamerayı başka kişilerin görüntüye girmeyeceği biçimde yerleştir. Soyunma odası gibi mahremiyet beklentisi olan ortak alanlarda kamerayı kullanma. Görüntü kaydedilmese de başkalarının rahatsız olmamasını sağlamak senin sorumluluğundadır.',
        ],
      },
      {
        h: '5. Sayımın doğruluğu',
        p: [
          'Sayaç; ışığa, kamera açısına, kıyafete ve mesafeye bağlı olarak tekrarları eksik ya da fazla sayabilir. Sonuçlar eğlence ve kişisel takip amaçlıdır; resmî bir ölçüm ya da yarışma sonucu değildir. Sayım hatalarından doğan rank ya da sıralama farkları için sorumluluk kabul etmiyoruz.',
        ],
      },
    ],
  },
  {
    id: 'subscription',
    title: 'Abonelik, Ödeme ve İade Koşulları',
    summary: 'Deneme, yenileme, iptal, cayma hakkı ve iadeler.',
    sections: [
      {
        h: '1. Ücretsiz ve Premium',
        p: [
          'Uygulama’nın temel özellikleri ücretsizdir. Premium, ödeme sayfasında ve Premium ekranında listelenen ek özellikleri açan dijital bir abonelik hizmetidir. Premium’un kapsamı zaman içinde değişebilir; mevcut döneminde sana sunulan temel faydalar dönem sonuna kadar korunur.',
        ],
      },
      {
        h: '2. Ücretsiz deneme',
        p: [
          'Hesap başına bir kez, Premium ekranında belirtilen süreyle ücretsiz deneme başlatabilirsin. Deneme için ödeme bilgisi istenmiyorsa deneme bitiminde kendiliğinden ücretli aboneliğe dönüşmez; Premium özellikler kapanır ve ücretsiz sürüme dönersin. Deneme sırasında ödeme bilgisi alınıyorsa bu, ödeme sayfasında açıkça belirtilir.',
        ],
      },
      {
        h: '3. Fiyat ve ödeme',
        p: [
          'Güncel fiyat, para birimi, vergiler ve fatura dönemi, satın almadan önce ödeme sayfasında gösterilir; bağlayıcı olan o sayfadaki tutardır. Fiyat, fatura ülkene göre değişebilir.',
          'Ödeme, ödeme sayfasında adı belirtilen ödeme sağlayıcısı ya da uygulama mağazası tarafından alınır. Bu durumda satış sözleşmesinin tarafı ve faturayı düzenleyen o sağlayıcı olabilir; kart bilgilerini biz görmeyiz.',
        ],
      },
      {
        h: '4. Otomatik yenileme',
        p: [
          'Aylık ve yıllık abonelikler, dönem bitmeden iptal edilmedikçe aynı süreyle ve o tarihte geçerli fiyatla kendiliğinden yenilenir. Fiyat değişikliklerini yenilemeden makul bir süre önce bildiririz; kabul etmiyorsan yenilemeden önce iptal edebilirsin.',
        ],
      },
      {
        h: '5. İptal',
        p: [
          'Aboneliğini dilediğin zaman, satın aldığın kanaldan (ödeme sağlayıcısının müşteri portalı ya da uygulama mağazasının abonelik ayarları) iptal edebilirsin. İptal, içinde bulunduğun dönemin sonunda geçerli olur; o tarihe kadar Premium açık kalır ve kalan süre için kısmi iade yapılmaz.',
          'Uygulamayı silmek ya da hesabını silmek, mağaza üzerinden alınmış bir aboneliği kendiliğinden iptal etmez; iptali ayrıca yapmalısın.',
        ],
      },
      {
        h: '6. Cayma hakkı',
        p: [
          'Tüketici sıfatıyla, mesafeli sözleşmelerde kural olarak on dört gün içinde gerekçe göstermeden cayma hakkın vardır.',
          'Ancak Premium, elektronik ortamda anında ifa edilen bir hizmet ve gayrimaddi dijital içeriktir. Satın alma sırasında hizmetin hemen başlamasını onayladığında, Mesafeli Sözleşmeler Yönetmeliği’nin cayma hakkının istisnalarına ilişkin hükümleri uyarınca ifaya başlanan hizmet bakımından cayma hakkını kullanamayabilirsin. Bu onay ödeme sayfasında ayrıca alınır.',
          'Yaşadığın ülkenin emredici tüketici mevzuatı daha geniş bir cayma ya da iade hakkı tanıyorsa o haklar saklıdır.',
        ],
      },
      {
        h: '7. İadeler',
        p: [
          'Mükerrer tahsilat, yetkisiz işlem ya da hizmetin bizden kaynaklanan bir nedenle sunulamaması hâlinde iade talep edebilirsin. Uygulama mağazasından yapılan satın almalarda iade, mağazanın kendi iade sürecine tabidir.',
          `Diğer iade talepleri için sipariş bilgilerinle birlikte ${O.email} adresine yaz; talebini makul sürede değerlendiririz.`,
        ],
      },
      {
        h: '8. Ödenmeyen dönem',
        p: [
          'Yenileme ödemesi alınamazsa Premium özellikleri askıya alabiliriz. Verilerin silinmez; ücretsiz sürümün sınırları içinde erişmeye devam edersin.',
        ],
      },
      {
        h: '9. Uyuşmazlık',
        p: [
          'Şikâyetlerini önce bize iletmeni rica ederiz. Türkiye’de, Ticaret Bakanlığı’nın her yıl ilan ettiği parasal sınırlar dâhilinde yerleşim yerindeki ya da işlemin yapıldığı yerdeki tüketici hakem heyetine, bu sınırların üzerinde tüketici mahkemesine başvurabilirsin.',
        ],
      },
    ],
  },
  {
    id: 'community',
    title: 'Sıralama ve Topluluk Kuralları',
    summary: 'Görünen ad, dürüst sonuç ve düello davranış kuralları.',
    sections: [
      {
        h: '1. Katılım isteğe bağlıdır',
        p: [
          'Sıralamaya ve canlı düelloya katılmak zorunlu değildir. Katıldığında seçtiğin görünen ad ve puanın diğer katılımcılara gösterilir. Sıralamadan dilediğin zaman çıkabilirsin; çıktığında kaydın silinir.',
        ],
      },
      {
        h: '2. Görünen ad',
        p: [
          'Gerçek adını kullanmak zorunda değilsin. Görünen adın; hakaret, nefret söylemi, cinsel içerik, tehdit, başka bir kişiyi ya da markayı taklit, reklam ya da iletişim bilgisi içeremez. Uygunsuz adları değiştirebilir ya da kaydı kaldırabiliriz.',
        ],
      },
      {
        h: '3. Dürüst sonuç',
        p: [
          'Yalnızca gerçekten ve kendi başına tamamladığın setleri kaydet. Uydurma ağırlık ya da tekrar girmek, başkasının sonucunu kendi sonucun gibi yayımlamak, sayacı yanıltmak ve Uygulama’yı ya da sunucuyu manipüle ederek puan elde etmek yasaktır.',
          'Sonuçlar kullanıcı beyanına dayanır; sunucu kaldırışları doğrulamaz. Bu nedenle sıralama resmî bir yarışma değildir, sıralamadaki bir konum herhangi bir ödül, unvan ya da hak doğurmaz ve sıralamanın doğruluğunu garanti etmeyiz.',
        ],
      },
      {
        h: '4. Düello davranışı',
        p: [
          'Rakibine saygılı davran. Düelloyu, rakibi rahatsız etmek ya da hizmeti aksatmak için kullanma. Kendini zorlayarak tekniğini bozma; rakibin ne yaparsa yapsın Sağlık ve Güvenlik Uyarısı geçerlidir.',
        ],
      },
      {
        h: '5. Yaptırımlar',
        p: [
          'Kuralları ihlal eden kayıtları silebilir, puanı sıfırlayabilir, kullanıcıyı sıralamadan ya da düellodan geçici ya da kalıcı olarak çıkarabilir ve gerekirse hesabı kapatabiliriz. Şüpheli bir sonuç ya da uygunsuz bir ad görürsen bize bildirebilirsin.',
          `Bildirim ve itiraz: ${O.email}`,
        ],
      },
    ],
  },
  {
    id: 'storage',
    title: 'Çerez ve Yerel Depolama Politikası',
    summary: 'Reklam ya da izleme çerezi yok; yalnızca uygulamanın çalışması için gereken depolama.',
    sections: [
      {
        h: '1. Çerez kullanmıyoruz',
        p: [
          'Kor reklam, analitik ya da üçüncü taraf izleme çerezi kullanmaz. Seni siteler ya da uygulamalar arasında izlemeyiz.',
        ],
      },
      {
        h: '2. Yerel depolama',
        p: [
          'Antrenmanların, profilin ve ayarların cihazının yerel depolamasında (localStorage) tutulur. Bu depolama Uygulama’nın çalışması için zorunludur; onsuz kayıtların her açılışta kaybolur.',
          'Hesabına giriş yaptıysan oturumunu açık tutmak için bir oturum anahtarı da yerel depolamada saklanır. Çıkış yaptığında silinir.',
        ],
      },
      {
        h: '3. Çevrimdışı önbellek',
        p: [
          'Uygulama’nın dosyaları (arayüz, yazı tipleri, hareket görselleri ve şınav sayacının modeli) internet yokken de çalışabilmesi için cihazında önbelleğe alınır. Bu önbellek kişisel veri içermez.',
        ],
      },
      {
        h: '4. Kamera izni',
        p: [
          'Şınav sayacı için verdiğin kamera izni cihazının ya da tarayıcının izin ayarlarında tutulur ve oradan geri alınabilir.',
        ],
      },
      {
        h: '5. Nasıl silerim',
        p: [
          'Profil ekranındaki sıfırlama seçeneğiyle Uygulama içindeki tüm cihaz verilerini silebilirsin. Tarayıcında site verilerini temizlemek ya da uygulamayı kaldırmak da yerel depolamayı ve önbelleği siler. Bu işlemler geri alınamaz; önce yedek almanı öneririz.',
        ],
      },
    ],
  },
  {
    id: 'ip',
    title: 'Fikrî Mülkiyet ve Telif Bildirimi',
    summary: 'Kor’a ait haklar, üçüncü taraf markaları ve ihlal bildirimi.',
    sections: [
      {
        h: '1. Kor’a ait haklar',
        p: [
          'Uygulama’nın kaynak kodu, arayüz tasarımı, rank sistemi ve kademe adları, amblemler, simgeler, metinler ve “Kor” adı ile logosu bize ya da lisans verenlerimize aittir ve fikrî mülkiyet mevzuatıyla korunur. Yazılı iznimiz olmadan kopyalanamaz, çoğaltılamaz, değiştirilemez, dağıtılamaz ve ticari amaçla kullanılamaz.',
        ],
      },
      {
        h: '2. Senin içeriğin',
        p: [
          'Kendi antrenman kayıtların ve içe aktardığın veriler sana aittir. Bunları dilediğin zaman dışa aktarabilirsin.',
        ],
      },
      {
        h: '3. Üçüncü taraf adları ve markaları',
        p: [
          'İçe aktarma ekranında adı geçen Strong, Hevy ve FitNotes ile Uygulama’da anılan diğer ürün ve şirket adları kendi sahiplerinin markalarıdır. Bu adlar yalnızca dosya biçimini tanımlamak için kullanılır; Kor bu şirketlerle bağlantılı değildir, onlar tarafından desteklenmez ya da onaylanmaz.',
          'Hareket adları ve antrenman programı türleri (örneğin “Push Pull Legs”) genel kullanımdaki spor terimleridir.',
        ],
      },
      {
        h: '4. Açık kaynak bileşenler',
        p: [
          'Uygulama, kendi lisansları altında dağıtılan açık kaynak yazılım ve yazı tipleri içerir. Bu bileşenlerin hakları kendi sahiplerine aittir ve ilgili lisans koşulları geçerlidir.',
        ],
      },
      {
        h: '5. İhlal bildirimi',
        p: [
          `Uygulama’daki bir içeriğin fikrî hakkını ihlal ettiğini düşünüyorsan; hak sahibi olduğunu gösteren bilgi, ihlal ettiğini düşündüğün içeriğin tanımı ve iletişim bilgilerinle birlikte ${O.email} adresine yaz. Bildirimi inceler ve haklı bulursak içeriği makul sürede kaldırırız.`,
        ],
      },
    ],
  },
]

const LEGAL_DOCS_EN: LegalDoc[] = legalEn(O)

/** Seçili dildeki metin listesi. Türkçe dışındaki diller şimdilik İngilizce metni gösterir. */
export function legalDocs(): LegalDoc[] {
  return lang() === 'tr' ? LEGAL_DOCS_TR : LEGAL_DOCS_EN
}

export function legalDoc(id: string | undefined): LegalDoc | undefined {
  return legalDocs().find((d) => d.id === id)
}
