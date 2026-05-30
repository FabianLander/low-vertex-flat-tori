import java.awt.*;

public class PopupShapeCanvas extends PopupPanel {
    ShapeCanvas S;

    public PopupShapeCanvas() {
        super("Intrinsic Structure Display", 500,600);
        S=new ShapeCanvas();
        S.setSize(500,600);
        add(S);
        S.setBackground(Color.black);
        setVisible(true);
        F.setSize(500,600);
    }

    public void resized(int w, int h){
	try {S.setSize(w,h);}
	catch(Exception e) {}
    }
    
}
