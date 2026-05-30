import java.awt.*;

/**This is just a wrapper for the documentation window.*/

public class PopupDocumentCanvas extends PopupPanel {
    DocumentCanvas D;

    public PopupDocumentCanvas() {
        super("Instructions", 500,500);
        D=new DocumentCanvas();
        D.setSize(500,500);
        add(D);
        setVisible(true);
        F.setSize(500,500);
    }

    public void resized(int w, int h){
	try {
            D.setSize(w,h);
	}
	catch(Exception e) {}
    }
    
}
