import { EmailContent } from "~/types";
import { db } from "../db";
import { sendEmailThroughSes } from "../ses";
import { APP_SETTINGS } from "~/utils/constants";

export async function sendEmail(
  emailContent: EmailContent & { teamId: number }
) {
  const { to, from, subject, text, html, teamId } = emailContent;

  const domains = await db.domain.findMany({ where: { teamId } });

  const fromDomain = from.split("@")[1];
  if (!fromDomain) {
    throw new Error("From email is not valid");
  }

  const domain = domains.find((domain) => domain.name === fromDomain);
  if (!domain) {
    throw new Error("Domain not found. Add domain to unsend first");
  }

  if (domain.status !== "SUCCESS") {
    throw new Error("Domain is not verified");
  }

  const messageId = await sendEmailThroughSes({
    to,
    from,
    subject,
    text,
    html,
    region: domain.region,
    configurationSetName: getConfigurationSetName(
      domain.clickTracking,
      domain.openTracking
    ),
  });

  if (messageId) {
    return await db.email.create({
      data: {
        to,
        from,
        subject,
        text,
        html,
        id: messageId,
        teamId,
        domainId: domain.id,
      },
    });
  }
}

function getConfigurationSetName(
  clickTracking: boolean,
  openTracking: boolean
) {
  if (clickTracking && openTracking) {
    return APP_SETTINGS.SES_CONFIGURATION_FULL;
  }
  if (clickTracking) {
    return APP_SETTINGS.SES_CONFIGURATION_CLICK_TRACKING;
  }
  if (openTracking) {
    return APP_SETTINGS.SES_CONFIGURATION_OPEN_TRACKING;
  }

  return APP_SETTINGS.SES_CONFIGURATION_GENERAL;
}