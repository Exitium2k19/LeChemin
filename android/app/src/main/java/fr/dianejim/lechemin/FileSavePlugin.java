package fr.dianejim.lechemin;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;

/**
 * Ouvre le sélecteur de documents Android (ACTION_CREATE_DOCUMENT) afin que
 * l'utilisateur choisisse explicitement le nom et le dossier de sauvegarde.
 */
@CapacitorPlugin(name = "FileSave")
public class FileSavePlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String base64Data = call.getString("data");

        if (filename == null || filename.trim().isEmpty() || base64Data == null) {
            call.reject("Nom de fichier ou données manquants");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        startActivityForResult(call, intent, "saveFileResult");
    }

    @ActivityCallback
    private void saveFileResult(PluginCall call, ActivityResult activityResult) {
        JSObject result = new JSObject();
        Intent intent = activityResult.getData();

        if (activityResult.getResultCode() != Activity.RESULT_OK || intent == null || intent.getData() == null) {
            result.put("canceled", true);
            call.resolve(result);
            return;
        }

        Uri destination = intent.getData();
        String base64Data = call.getString("data");
        if (base64Data == null) {
            call.reject("Les données de la sauvegarde ne sont plus disponibles");
            return;
        }

        try (OutputStream output = getContext().getContentResolver().openOutputStream(destination, "w")) {
            if (output == null) {
                call.reject("Impossible d’ouvrir le fichier choisi");
                return;
            }
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            output.write(bytes);
            output.flush();

            result.put("canceled", false);
            result.put("uri", destination.toString());
            call.resolve(result);
        } catch (IllegalArgumentException error) {
            call.reject("Les données de la sauvegarde sont invalides", error);
        } catch (IOException | SecurityException error) {
            call.reject("Impossible d’écrire dans le dossier choisi", error);
        }
    }
}
