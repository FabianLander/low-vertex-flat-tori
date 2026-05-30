import java.awt.*;
import java.math.*;


public class Manager  {
    PictureCanvas P;
    TorusCanvas T;
    ShapeCanvas S;
    ControlCanvas C;
    DocumentCanvas D;
    EyeCanvas E;
    
    public Manager() {}

    public void repaint() {
	try{P.repaint();} catch(Exception e) {}
	try{C.repaint();} catch(Exception e) {}
	try{T.repaint();} catch(Exception e) {}
	try{D.repaint();} catch(Exception e) {}
	try{S.repaint();} catch(Exception e) {}
	try{E.repaint();} catch(Exception e) {}
    }


    /**checking if other windows are alive*/

    public boolean torusCanvasAlive() {
	try {
	    boolean test=T.alive;
	}
	catch(Exception e) {return false;}
	return true;
    }

    public boolean shapeCanvasAlive() {
	try {
	    boolean test=S.alive;
	}
	catch(Exception e) {return false;}
	return true;
    }


}

    

