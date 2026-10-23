export const TICKET_PANEL_BANNER_FILENAME = 'kraken-elite-ticket-banner.png';
export const TICKET_PANEL_BANNER_PATH = `assets/images/${TICKET_PANEL_BANNER_FILENAME}`;
export const TICKET_PANEL_BANNER_URL = `attachment://${TICKET_PANEL_BANNER_FILENAME}`;

export function getTicketPanelBannerFile() {
    return {
        attachment: TICKET_PANEL_BANNER_PATH,
        name: TICKET_PANEL_BANNER_FILENAME,
    };
}