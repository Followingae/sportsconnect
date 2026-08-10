import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getPlatformSettings } from "@/lib/queries/settings";
import { SettingsForm } from "@/components/portal/settings-form";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();

  return (
    <>
      <PortalHeader crumb="Configuration" title="Platform settings" />
      <PortalBody>
        <SettingsForm
          initial={{
            bank_account_name: settings?.bank_account_name ?? "",
            bank_name: settings?.bank_name ?? "",
            bank_iban: settings?.bank_iban ?? "",
            bank_swift: settings?.bank_swift ?? "",
            support_email: settings?.support_email ?? "",
            support_phone: settings?.support_phone ?? "",
            default_terms: settings?.default_terms ?? "",
            default_cancellation_policy: settings?.default_cancellation_policy ?? "",
            payment_methods_enabled: settings?.payment_methods_enabled ?? [
              "bank_transfer",
              "cash_at_venue",
            ],
          }}
        />
      </PortalBody>
    </>
  );
}
