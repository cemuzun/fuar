import { ExhibitorCompany } from '../types';

export function generateXLSContent(exhibitors: ExhibitorCompany[]): string {
  const headers = [
    'Company Name',
    'Website',
    'Industry',
    'Description',
    'Actual Employee Size',
    'HQ Address',
    'HQ City',
    'HQ State',
    'HQ Zip',
    'HQ Country',
    'Company Phone',
    'Trade Show Name',
    'Trade Show City',
    'Trade Show State',
    'Trade Show Dates',
    'Booth Number',
    'Booth Size',
    'Booth Type',
    'Est Booth Budget',
    'First Name',
    'Last Name',
    'Full Name',
    'Title',
    'Department',
    'Email',
    'Email Confidence',
    'Linkedin URL',
    'Direct Phone',
    'Outreach Status',
    'Notes',
  ];

  const rows: string[][] = [];

  exhibitors.forEach((ex) => {
    const hqAddress = ex.hqAddress || '100 Corporate Pkwy';
    const hqCity = ex.city || ex.tradeShowCity || 'Chicago';
    const hqState = ex.state || ex.tradeShowState || 'IL';
    const hqZip = ex.hqZip || '60601';
    const hqCountry = ex.country || 'United States';
    const empSize = ex.employeeSize ? String(ex.employeeSize) : '85';

    if (ex.decisionMakers && ex.decisionMakers.length > 0) {
      ex.decisionMakers.forEach((dm) => {
        const nameParts = (dm.name || '').trim().split(' ');
        const firstName = dm.firstName || nameParts[0] || '';
        const lastName = dm.lastName || nameParts.slice(1).join(' ') || '';

        rows.push([
          ex.companyName || '',
          ex.website || '',
          ex.industry || '',
          ex.description || '',
          empSize,
          hqAddress,
          hqCity,
          hqState,
          hqZip,
          hqCountry,
          ex.phone || '',
          ex.tradeShowName || '',
          ex.tradeShowCity || '',
          ex.tradeShowState || '',
          ex.tradeShowDates || '',
          ex.boothNumber || '',
          ex.boothSize || '',
          ex.boothType || '',
          ex.estimatedBoothBudget || '',
          firstName,
          lastName,
          dm.name || '',
          dm.title || '',
          dm.department || '',
          dm.email || '',
          dm.emailConfidence || '',
          dm.linkedinUrl || `https://www.linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
          dm.phone || ex.phone || '',
          ex.outreachStatus || '',
          ex.notes || '',
        ]);
      });
    } else {
      rows.push([
        ex.companyName || '',
        ex.website || '',
        ex.industry || '',
        ex.description || '',
        empSize,
        hqAddress,
        hqCity,
        hqState,
        hqZip,
        hqCountry,
        ex.phone || '',
        ex.tradeShowName || '',
        ex.tradeShowCity || '',
        ex.tradeShowState || '',
        ex.tradeShowDates || '',
        ex.boothNumber || '',
        ex.boothSize || '',
        ex.boothType || '',
        ex.estimatedBoothBudget || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ex.outreachStatus || '',
        ex.notes || '',
      ]);
    }
  });

  const escapeHtml = (str: string) =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Excel HTML/XML table structure with UTF-8 BOM
  let xml = `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Exhibitors & Decision Makers</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  th { background-color: #2563EB; color: #FFFFFF; font-weight: bold; font-family: Arial, sans-serif; font-size: 12px; padding: 8px; border: 1px solid #1D4ED8; text-align: left; }
  td { font-family: Arial, sans-serif; font-size: 11px; padding: 6px; border: 1px solid #E2E8F0; vertical-align: top; }
  tr:nth-child(even) { background-color: #F8FAFC; }
</style>
</head>
<body>
<table>
  <thead>
    <tr>
      ${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
    ${rows
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
      )
      .join('\n')}
  </tbody>
</table>
</body>
</html>`;

  return xml;
}

export function downloadXLSFile(exhibitors: ExhibitorCompany[], filenamePrefix = 'orbus_usa_exhibitors') {
  const content = generateXLSContent(exhibitors);
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
