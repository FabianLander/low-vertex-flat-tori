import java.awt.*;

/**This is just a wrapper for the documentation window.*/

public class PopupDocumentCanvas extends PopupPanel {
    DocumentCanvas D;

    public PopupDocumentCanvas() {
        super("Instructions", 400,440);
        D=new DocumentCanvas();
        D.setSize(400,440);
        add(D);
        setVisible(true);
        F.setSize(400,440);
    }

    public void resized(int w, int h){
	try {
            D.setSize(w,h);
	}
	catch(Exception e) {}
    }
    
}
