export const generateCertificateLinkedInUrl = (certData: {
    title: string;
    organizationName: string;
    issueYear: number;
    issueMonth: number;
    certId: string;
    certUrl: string;
}) => {
    // LinkedIn Add to Profile URL format
    // Ref: https://www.linkedin.com/help/linkedin/answer/a511394
    const baseUrl = "https://www.linkedin.com/profile/add";
    const params = new URLSearchParams({
        startTask: "CERTIFICATION_NAME",
        name: certData.title,
        organizationName: certData.organizationName,
        issueYear: certData.issueYear.toString(),
        issueMonth: certData.issueMonth.toString(),
        certId: certData.certId,
        certUrl: certData.certUrl,
    });

    return `${baseUrl}?${params.toString()}`;
};

export const generateLinkedInShareUrl = (text: string, url: string) => {
    const baseUrl = "https://www.linkedin.com/sharing/share-offsite/";
    const params = new URLSearchParams({
        url: url,
    });
    // Note: LinkedIn sharing doesn't support a 'text' parameter in the URL directly anymore for the share-offsite link,
    // but the URL will be scraped for metadata. 
    return `${baseUrl}?${params.toString()}`;
};
