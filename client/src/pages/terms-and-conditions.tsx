import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

export default function TermsAndConditions() {
  const { language } = useLanguage();
  const t = useTranslations(language);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          {t.termsAndConditions}
        </h1>
        
        <Card className="p-6 bg-white dark:bg-gray-800">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6 text-gray-700 dark:text-gray-300">
              
              {/* Last Updated */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.lastUpdated}: {language === 'nl' ? '1 oktober 2025' : 'October 1, 2025'}
              </p>

              {/* 1. Service Description */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  1. {t.serviceDescription}
                </h2>
                <p className="mb-2">{t.termsServiceDesc1}</p>
                <p>{t.termsServiceDesc2}</p>
              </section>

              {/* 2. Medical Disclaimer */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  2. {t.medicalDisclaimer}
                </h2>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-3">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                    {t.importantNotice}
                  </p>
                </div>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t.termsMedical1}</li>
                  <li>{t.termsMedical2}</li>
                  <li>{t.termsMedical3}</li>
                  <li>{t.termsMedical4}</li>
                  <li>{t.termsMedical5}</li>
                </ul>
              </section>

              {/* 3. AI-Generated Content */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  3. {t.aiGeneratedContent}
                </h2>
                <p className="mb-2">{t.termsAI1}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t.termsAI2}</li>
                  <li>{t.termsAI3}</li>
                  <li>{t.termsAI4}</li>
                  <li>{t.termsAI5}</li>
                </ul>
              </section>

              {/* 4. User Responsibilities */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  4. {t.userResponsibilities}
                </h2>
                <p className="mb-2">{t.termsUserResp1}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t.termsUserResp2}</li>
                  <li>{t.termsUserResp3}</li>
                  <li>{t.termsUserResp4}</li>
                  <li>{t.termsUserResp5}</li>
                  <li>{t.termsUserResp6}</li>
                </ul>
              </section>

              {/* 5. Data & Privacy */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  5. {t.dataAndPrivacy}
                </h2>
                <p className="mb-2">{t.termsPrivacy1}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t.termsPrivacy2}</li>
                  <li>{t.termsPrivacy3}</li>
                  <li>{t.termsPrivacy4}</li>
                  <li>{t.termsPrivacy5}</li>
                  <li>{t.termsPrivacy6}</li>
                  <li>{t.termsPrivacy7}</li>
                  <li>{t.termsPrivacy8}</li>
                  <li>{t.termsPrivacy9}</li>
                  <li>{t.termsPrivacy10}</li>
                  <li>{t.termsPrivacy11}</li>
                </ul>
                <p className="mt-3 text-sm">{t.termsPrivacy12}</p>
              </section>

              {/* 6. Third-Party Integrations */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  6. {t.thirdPartyIntegrations}
                </h2>
                <p className="mb-2">{t.termsThirdParty1}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t.termsThirdParty2}</li>
                  <li>{t.termsThirdParty3}</li>
                  <li>{t.termsThirdParty4}</li>
                </ul>
                <p className="mt-3">{t.termsThirdParty5}</p>
              </section>

              {/* 7. Limitation of Liability */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  7. {t.limitationOfLiability}
                </h2>
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-3">
                  <p className="font-semibold text-red-800 dark:text-red-200">
                    {t.termsLiability0}
                  </p>
                </div>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t.termsLiability1}</li>
                  <li>{t.termsLiability2}</li>
                  <li>{t.termsLiability3}</li>
                  <li>{t.termsLiability4}</li>
                  <li>{t.termsLiability5}</li>
                </ul>
              </section>

              {/* 8. Account Terms */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  8. {t.accountTerms}
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t.termsAccount1}</li>
                  <li>{t.termsAccount2}</li>
                  <li>{t.termsAccount3}</li>
                  <li>{t.termsAccount4}</li>
                  <li>{t.termsAccount5}</li>
                </ul>
              </section>

              {/* 9. Intellectual Property */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  9. {t.intellectualProperty}
                </h2>
                <p className="mb-2">{t.termsIP1}</p>
                <p>{t.termsIP2}</p>
              </section>

              {/* 10. Changes to Terms */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  10. {t.changesToTerms}
                </h2>
                <p className="mb-2">{t.termsChanges1}</p>
                <p>{t.termsChanges2}</p>
              </section>

              {/* 11. Governing Law */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  11. {t.governingLaw}
                </h2>
                <p>{t.termsLaw1}</p>
              </section>

              {/* 12. Contact Information */}
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  12. {t.contactInformation}
                </h2>
                <p>{t.termsContact1}</p>
              </section>

              {/* Acceptance */}
              <section className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-6">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  {t.termsAcceptance}
                </p>
              </section>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
