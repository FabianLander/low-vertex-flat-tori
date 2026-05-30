import java.awt.*;

public class PopupEyeCanvas extends PopupPanel {
    EyeCanvas E;

    public PopupEyeCanvas() {
        super("Eye Window", 300,300);
        E=new EyeCanvas();
        E.setSize(300,300);
        add(E);
        E.setBackground(Color.black);
        setVisible(true);
        F.setSize(300,300);
    }

    public void resized(int w, int h){
	try {E.setSize(w,h);}
	catch(Exception e) {}
    }
    
}
