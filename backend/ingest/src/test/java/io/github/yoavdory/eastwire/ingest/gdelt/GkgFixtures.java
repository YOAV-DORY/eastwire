package io.github.yoavdory.eastwire.ingest.gdelt;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** Builds synthetic GKG rows and files. Titles and URLs are invented; no real article text. */
final class GkgFixtures {

    static final String NEW_DELHI = "4#New Delhi, Delhi, India#IN#IN07#17911#28.6#77.2#-2106102#9";
    static final String INDIA = "1#India#IN#IN##20#77#IN#16";
    static final String SEOUL = "4#Seoul, Seoul-t'ukpyolsi, South Korea#KS#KS11#13509#37.5664#127.0#-716583#40";
    static final String HOSUR = "4#Hosur, Tamil Nadu, India#IN#IN25#70248#12.7409#77.8253#-2103917#120";
    static final String TAMIL_NADU = "5#Tamil Nadu, Tamil Nadu, India#IN#IN25#70248#11#78#-2112557#95";
    static final String UNITED_STATES = "1#United States#US#US##39.828175#-98.5795#US#1698";
    static final String TEXAS_CITY = "3#Austin, Texas, United States#US#USTX#TX453#30.2672#-97.7431#1384879#50";

    private GkgFixtures() {
    }

    static String row(String date, String url, String title, String locations) {
        String[] cols = new String[GkgParser.COLUMNS];
        Arrays.fill(cols, "");
        cols[0] = date + "-1";
        cols[1] = date;
        cols[2] = "1";
        cols[3] = url.replaceFirst("https?://(www\\.)?", "").replaceFirst("/.*", "");
        cols[4] = url;
        cols[7] = "TAX_FNCACT;ECON_INFLATION;";
        cols[10] = locations;
        cols[26] = (title == null ? "" : "<PAGE_TITLE>" + title + "</PAGE_TITLE>")
                + "<PAGE_PRECISEPUBTIMESTAMP>20261013090000</PAGE_PRECISEPUBTIMESTAMP>";
        return String.join("\t", cols);
    }

    static byte[] zip(String name, List<String> rows) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry(name));
            zip.write(String.join("\n", rows).getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return bytes.toByteArray();
    }

    static String lastUpdate(String slot) {
        String base = "http://data.gdeltproject.org/gdeltv2/" + slot;
        return "91927 4da9 " + base + ".export.CSV.zip\n"
                + "114375 dc7c " + base + ".mentions.CSV.zip\n"
                + "5306558 d0f7 " + base + ".gkg.csv.zip\n";
    }
}
