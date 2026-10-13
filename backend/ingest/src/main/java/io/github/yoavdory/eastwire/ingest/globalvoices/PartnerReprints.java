package io.github.yoavdory.eastwire.ingest.globalvoices;

import java.net.URI;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

/**
 * Detects Global Voices posts that are reprints from partner outlets. Their text may not be
 * under Global Voices' CC BY license, so they are shown as headline and link only.
 *
 * <p>Every Global Voices feed item ends with "Originally published on Global Voices"; that
 * self-reference is not a partner reprint. A notice naming or linking another outlet is.
 */
final class PartnerReprints {

    private static final Pattern NOTICE = Pattern.compile(
            "(?i)(originally (?:published|appeared)|republished|re-published|content[- ]sharing|partnership with)");
    private static final Pattern ORIGIN_NAME = Pattern.compile(
            "(?i)originally (?:published|appeared) (?:on|in|by|at) ([^.,;:]{2,60})");

    private PartnerReprints() {
    }

    static boolean isPartnerReprint(String contentHtml) {
        if (contentHtml == null || contentHtml.isBlank()) {
            return false;
        }
        Document doc = Jsoup.parse(contentHtml);
        for (Element block : doc.select("p, em, i, div, span, small, blockquote")) {
            String text = block.ownText().isBlank() ? block.text() : block.ownText() + " " + block.text();
            if (!NOTICE.matcher(text).find()) {
                continue;
            }
            for (Element link : block.select("a[href]")) {
                if (!isGlobalVoices(link.attr("href"))) {
                    return true;
                }
            }
            Matcher origin = ORIGIN_NAME.matcher(text);
            while (origin.find()) {
                if (!origin.group(1).toLowerCase(Locale.ROOT).contains("global voices")) {
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean isGlobalVoices(String href) {
        try {
            String host = URI.create(href.strip()).getHost();
            return host == null || host.equalsIgnoreCase("globalvoices.org") || host.toLowerCase(Locale.ROOT).endsWith(".globalvoices.org");
        } catch (IllegalArgumentException e) {
            return true; // a broken link is not evidence of a partner
        }
    }
}
