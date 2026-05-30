import java.awt.*;

public class PopupNewtonCanvas extends PopupPanel {
    NewtonCanvas N;

    public PopupNewtonCanvas() {
        super("Newton Window", 610,600);
        N=new NewtonCanvas();
        N.setSize(610,600);
        add(N);
        N.setBackground(Color.black);
        setVisible(true);
        F.setSize(610,600);
    }

    public void resized(int w, int h){
	try {N.setSize(w,h);}
	catch(Exception e) {}
    }
    
}
