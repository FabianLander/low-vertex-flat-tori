import java.awt.*;

public class PopupBundleCanvas extends PopupPanel {
    BundleCanvas Z;

    public PopupBundleCanvas() {
        super("Bundle Window", 610,600);
        Z=new BundleCanvas();
        Z.setSize(610,600);
        add(Z);
        Z.setBackground(Color.black);
        setVisible(true);
        F.setSize(610,600);
    }

    public void resized(int w, int h){
	try {Z.setSize(w,h);}
	catch(Exception e) {}
    }
    
}
