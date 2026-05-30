import java.awt.*;

public class PopupGoldenCanvas extends PopupPanel {
    GoldenCanvas X;

    public PopupGoldenCanvas() {
        super("Golden Valley Parametrization", 400,900);
        X=new GoldenCanvas();
        X.setSize(400,900);
        add(X);
        X.setBackground(Color.black);
        setVisible(true);
        F.setSize(400,900);
    }

    public void resized(int w, int h){
	try {X.setSize(w,h);}
	catch(Exception e) {}
    }
    
}
