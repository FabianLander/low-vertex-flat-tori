import java.awt.*;

public class PopupPictureCanvas extends PopupPanel {
    PictureCanvas P;

    public PopupPictureCanvas() {
        super("Triangulation Combinatorics", 500,500);
        P=new PictureCanvas();
        P.setSize(500,500);
        add(P);
        P.setBackground(Color.black);
        setVisible(true);
        F.setSize(500,500);
    }

    public void resized(int w, int h){
	try {P.setSize(w,h);}
	catch(Exception e) {}
    }
    
}
