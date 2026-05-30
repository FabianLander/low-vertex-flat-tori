import java.awt.*;

public class PopupTorusCanvas extends PopupPanel {
    TorusCanvas T;

    public PopupTorusCanvas() {
        super("Torus Window", 600,600);
        T=new TorusCanvas();
        T.setSize(600,600);
        add(T);
        T.setBackground(Color.black);
        setVisible(true);
        F.setSize(600,600);
    }

    public void resized(int w, int h){
	try {T.setSize(w,h);}
	catch(Exception e) {}
    }
    
}
